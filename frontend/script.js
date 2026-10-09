// =========================================================
// RE/MAX Seu Imóvel — LP Carreira (Lidiane) · Direção A "Noturno"
// Header, animações de entrada, seção "Por que RE/MAX" e formulário de lead.
// =========================================================
(() => {
    "use strict";

    /* ---------- Rolagem: header, animações de entrada e "Por que RE/MAX" ---------- */

    const raiz = document.documentElement;
    const header = document.querySelector("[data-header]");
    const why = document.querySelector("[data-why]");
    const whyCols = why ? Array.from(why.querySelectorAll("[data-why-col]")) : [];
    const reasons = why ? Array.from(why.querySelectorAll("[data-reason]")) : [];
    const bars = why ? Array.from(why.querySelectorAll("[data-bar]")) : [];
    let reasonAtivo = -1;
    let pendentes = [];

    const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
    const KEYFRAMES = {
        up: [{ opacity: 0, transform: "translateY(28px)" }, { opacity: 1, transform: "none" }],
        rise: [{ opacity: 0, transform: "translateY(56px)" }, { opacity: 1, transform: "none" }],
        pop: [{ opacity: 0, transform: "scale(0.2)" }, { opacity: 1, transform: "scale(1)" }],
    };

    // Cria as animações pausadas; cada uma toca quando o elemento entra na tela.
    function prepararAnimacoes() {
        document.querySelectorAll("[data-reveal]").forEach((el) => {
            const anim = el.animate(KEYFRAMES[el.dataset.reveal] || KEYFRAMES.up, {
                duration: Number(el.dataset.dur || 900),
                delay: Number(el.dataset.delay || 0),
                easing: EASE,
                fill: "both",
            });
            anim.pause();
            // Ao terminar, o elemento volta ao estado natural do CSS e a animação é descartada.
            anim.onfinish = () => {
                el.classList.add("is-revealed");
                anim.cancel();
            };
            pendentes.push({ el, anims: [anim] });
        });

        // Traços SVG (contornos da casa) desenhados do início ao fim.
        document.querySelectorAll("[data-draw]").forEach((svg) => {
            const anims = Array.from(svg.querySelectorAll("path")).map((path) => {
                const total = path.getTotalLength();
                path.style.strokeDasharray = `${total} ${total}`;
                const anim = path.animate([{ strokeDashoffset: String(total) }, { strokeDashoffset: "0" }], {
                    duration: Number(svg.dataset.dur || 1800),
                    delay: Number(svg.dataset.delay || 0),
                    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                    fill: "both",
                });
                anim.pause();
                anim.onfinish = () => {
                    path.style.strokeDasharray = "";
                    anim.cancel();
                };
                return anim;
            });
            svg.classList.add("is-ready");
            pendentes.push({ el: svg, anims });
        });
    }

    function revelarVisiveis() {
        if (!pendentes.length) return;
        const vh = window.innerHeight;
        pendentes = pendentes.filter(({ el, anims }) => {
            const r = el.getBoundingClientRect();
            if (r.bottom < 0) {
                anims.forEach((a) => a.finish());
                return false;
            }
            if (r.top < vh * 0.9) {
                anims.forEach((a) => a.play());
                return false;
            }
            return true;
        });
    }

    // Em uma coluna só (mobile), o contador 01–08 não acompanha a lista.
    function ajustarLayoutWhy() {
        if (whyCols.length < 2) return;
        const empilhado = whyCols[1].getBoundingClientRect().top > whyCols[0].getBoundingClientRect().top + 4;
        why.classList.toggle("is-stacked", empilhado);
    }

    // Destaca o motivo mais próximo do meio da tela e atualiza contador e barras.
    function acompanharMotivos() {
        if (!reasons.length) return;
        const meio = window.innerHeight * 0.45;
        let melhor = 0;
        let menorDist = Infinity;
        reasons.forEach((el, i) => {
            const r = el.getBoundingClientRect();
            const dist = Math.abs(r.top + r.height / 2 - meio);
            if (dist < menorDist) {
                menorDist = dist;
                melhor = i;
            }
        });
        if (melhor === reasonAtivo) return;
        reasonAtivo = melhor;
        why.style.setProperty("--idx", String(melhor));
        reasons.forEach((el, i) => el.classList.toggle("is-active", i === melhor));
        bars.forEach((bar, i) => bar.classList.toggle("is-on", i <= melhor));
    }

    function atualizar() {
        revelarVisiveis();
        if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
        acompanharMotivos();
    }

    let frame = 0;
    function agendarAtualizacao() {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            atualizar();
        });
    }

    if (raiz.classList.contains("motion")) {
        try {
            prepararAnimacoes();
        } catch (err) {
            pendentes.forEach(({ anims }) => anims.forEach((a) => a.finish()));
            pendentes = [];
            raiz.classList.remove("motion");
        }
    }
    window.lpMotionReady = true;

    if (why) why.classList.add("is-tracking");
    ajustarLayoutWhy();
    atualizar();

    window.addEventListener("scroll", agendarAtualizacao, { passive: true });
    window.addEventListener("resize", () => {
        ajustarLayoutWhy();
        agendarAtualizacao();
    });
    window.addEventListener("load", () => {
        ajustarLayoutWhy();
        atualizar();
    });


    /* ---------- Envio do lead ---------- */

    // O lead é gravado no funil de Recrutamento do OnixTeam (OnixCloud) e é a
    // resposta dele que decide o "Pronto!". É o único destino: a cópia para o n8n
    // (backend antigo no Render) foi cortada em 09/10/2026, a pedido de Apollo.
    const CFG = typeof CONFIG !== "undefined" ? CONFIG : {};
    const PRAZO_ENVIO_MS = 15000;
    const UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

    /** Falha de envio com o motivo que a tela usa para escolher a mensagem. */
    class FalhaEnvio extends Error {
        constructor(motivo, campos) {
            super(motivo);
            this.motivo = motivo; // "campos" | "limite" | "rede" | "servidor"
            this.campos = campos || null;
        }
    }

    const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function postarNoOnixTeam(corpo) {
        const controle = new AbortController();
        const prazo = setTimeout(() => controle.abort(), PRAZO_ENVIO_MS);
        let res;
        try {
            res = await fetch(CFG.ONIX_LEAD_URL, {
                method: "POST",
                mode: "cors",
                credentials: "omit",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(corpo),
                signal: controle.signal,
            });
        } catch (err) {
            throw new FalhaEnvio("rede");
        } finally {
            clearTimeout(prazo);
        }
        if (res.status === 201) return;

        let resposta = null;
        try {
            resposta = await res.json();
        } catch (err) {
            // resposta sem corpo legível
        }
        if (res.status === 400 && resposta && resposta.campos) throw new FalhaEnvio("campos", resposta.campos);
        if (res.status === 429) throw new FalhaEnvio("limite");
        throw new FalhaEnvio(res.status >= 500 ? "rede" : "servidor");
    }

    // Uma segunda tentativa para queda de rede ou instabilidade do servidor: o
    // OnixTeam reconhece o reenvio da mesma pessoa e não duplica o card.
    async function gravarLead(corpo) {
        try {
            await postarNoOnixTeam(corpo);
        } catch (err) {
            if (!(err instanceof FalhaEnvio) || err.motivo !== "rede") throw err;
            await esperar(1500);
            await postarNoOnixTeam(corpo);
        }
    }

    /* ---------- Formulário ---------- */

    const form = document.getElementById("leadForm");
    if (!form) return;

    const campos = {
        nome: form.elements.nome,
        email: form.elements.email,
        telefone: form.elements.telefone,
        corretora: form.elements.corretora,
    };
    const radios = Array.from(form.querySelectorAll('input[name="corretor"]'));
    const corretoraField = document.getElementById("corretoraField");
    const submitBtn = document.getElementById("submitBtn");
    const statusMsg = document.getElementById("formStatus");
    const alertMsg = document.getElementById("formAlert");
    const alertTexto = document.getElementById("formAlertTexto");
    const sucesso = document.getElementById("formSuccess");
    const sucessoTitulo = document.getElementById("successTitle");
    const card = form.closest(".form-card");
    const ORDEM_CAMPOS = ["nome", "email", "telefone", "corretor", "corretora"];
    const TEXTO_FALHA = alertTexto ? alertTexto.textContent : "";
    let enviando = false;
    let telefoneDigitos = "";

    function setErro(nome, mensagem) {
        const erro = document.getElementById(`${nome}-erro`);
        if (!erro) return;
        erro.textContent = mensagem || "";
        erro.hidden = !mensagem;
        const alvos = nome === "corretor" ? radios : [campos[nome]];
        alvos.forEach((el) => {
            if (mensagem) el.setAttribute("aria-invalid", "true");
            else el.removeAttribute("aria-invalid");
        });
    }

    function limparErros() {
        ORDEM_CAMPOS.forEach((nome) => setErro(nome, null));
    }

    function focarCampo(nome) {
        (nome === "corretor" ? radios[0] : campos[nome]).focus();
    }

    // Máscara de telefone: (85) 3333-4444 ou (85) 98888-8888
    function formatarTelefone(d) {
        if (d.length <= 2) return d;
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    campos.telefone.addEventListener("input", (e) => {
        const el = campos.telefone;
        const valor = el.value;
        const cursor = el.selectionStart ?? valor.length;
        let digitos = valor.replace(/\D/g, "");
        let digitosAntes = valor.slice(0, cursor).replace(/\D/g, "").length;

        // Backspace num separador: apaga o dígito anterior a ele.
        if (e.inputType === "deleteContentBackward" && digitos === telefoneDigitos && digitosAntes > 0) {
            digitos = digitos.slice(0, digitosAntes - 1) + digitos.slice(digitosAntes);
            digitosAntes -= 1;
        }
        // Colado ou autopreenchido com o código do país (+55).
        if (digitos.length > 11 && digitos.startsWith("55") && e.inputType !== "insertText") {
            digitos = digitos.slice(2);
            digitosAntes = Math.max(0, digitosAntes - 2);
        }
        digitos = digitos.slice(0, 11);

        const formatado = formatarTelefone(digitos);
        el.value = formatado;
        telefoneDigitos = digitos;

        // Mantém o cursor depois do mesmo número de dígitos.
        let pos = 0;
        for (let vistos = 0; pos < formatado.length && vistos < Math.min(digitosAntes, digitos.length); pos++) {
            if (/\d/.test(formatado[pos])) vistos++;
        }
        if (document.activeElement === el) el.setSelectionRange(pos, pos);
        setErro("telefone", null);
    });

    ["nome", "email", "corretora"].forEach((nome) => {
        campos[nome].addEventListener("input", () => setErro(nome, null));
    });

    // Mostrar/ocultar campo de corretora
    radios.forEach((radio) => {
        radio.addEventListener("change", () => {
            corretoraField.hidden = form.elements.corretor.value !== "sim";
            setErro("corretor", null);
            setErro("corretora", null);
        });
    });

    function lerDados() {
        return {
            nome: campos.nome.value.trim().replace(/\s+/g, " "),
            email: campos.email.value.trim(),
            telefone: campos.telefone.value.trim(),
            corretor: form.elements.corretor.value,
            corretora: campos.corretora.value.trim(),
        };
    }

    // Os DDDs que existem no Brasil — a mesma lista do OnixTeam, que recusa os outros.
    const DDDS = new Set([
        11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
        71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
    ]);

    function erroDoTelefone(valor) {
        const d = valor.replace(/\D/g, "");
        if (d.length < 10) return "Informe um telefone com DDD";
        if (!DDDS.has(Number(d.slice(0, 2)))) return "Confira o DDD";
        if (d.length === 10 && "6789".includes(d[2])) return "Celular tem 9 dígitos depois do DDD";
        if ((d.length === 11 && d[2] !== "9") || (d.length === 10 && !"2345".includes(d[2]))) return "Confira o número";
        return null;
    }

    function validar(d) {
        const erros = {};
        if (d.nome.length < 3 || (d.nome.match(/\p{L}/gu) || []).length < 2) erros.nome = "Informe seu nome completo";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) erros.email = "Informe um e-mail válido";
        const erroTelefone = erroDoTelefone(d.telefone);
        if (erroTelefone) erros.telefone = erroTelefone;
        if (!d.corretor) erros.corretor = "Escolha uma opção";
        if (d.corretor === "sim" && !d.corretora) erros.corretora = "Informe sua corretora atual";
        return erros;
    }

    /** Origem e caminho, sem a query (que pode carregar identificador de clique). */
    function semQuery(url) {
        try {
            const u = new URL(url);
            return u.origin + u.pathname;
        } catch (err) {
            return "";
        }
    }

    // O que vai para o OnixTeam. Empresa, funil, etapa e etiqueta quem decide é o
    // servidor; daqui saem só as respostas e de onde a pessoa veio.
    function corpoDoLead(d) {
        const q = new URLSearchParams(window.location.search);
        const corpo = {
            nome: d.nome,
            email: d.email,
            telefone: d.telefone.replace(/\D/g, ""),
            corretor: d.corretor,
            corretora: d.corretor === "sim" ? d.corretora : "",
            pagina: window.location.origin + window.location.pathname,
            referrer: document.referrer ? semQuery(document.referrer) : "",
            veio_do_meta: q.has("fbclid"),
            veio_do_google: q.has("gclid") || q.has("gbraid") || q.has("wbraid"),
            nao_preencher: form.elements.nao_preencher ? form.elements.nao_preencher.value : "",
        };
        UTMS.forEach((k) => {
            const v = q.get(k);
            if (v) corpo[k] = v.slice(0, 120);
        });
        return corpo;
    }

    function setEnviando(sim) {
        enviando = sim;
        submitBtn.disabled = sim;
        statusMsg.hidden = !sim;
        form.setAttribute("aria-busy", String(sim));
    }

    function mostrarSucesso(nomeCompleto) {
        const primeiro = nomeCompleto.split(/\s+/)[0] || "";
        const nome = primeiro ? primeiro.charAt(0).toUpperCase() + primeiro.slice(1) : "";
        sucessoTitulo.textContent = nome ? `Pronto, ${nome}!` : "Pronto!";
        form.hidden = true;
        sucesso.hidden = false;
        // Se o topo do cartão ficou escondido (atrás do header), traz de volta.
        if (card && card.getBoundingClientRect().top < 76) card.scrollIntoView({ block: "start" });
        sucessoTitulo.focus({ preventScroll: true });
    }

    function mostrarFalha(err) {
        // O servidor recusou algum campo: a mensagem vai para o campo, como na validação daqui.
        if (err instanceof FalhaEnvio && err.motivo === "campos") {
            ORDEM_CAMPOS.forEach((nome) => setErro(nome, err.campos[nome]));
            const primeiro = ORDEM_CAMPOS.find((nome) => err.campos[nome]);
            if (primeiro) {
                focarCampo(primeiro);
                return;
            }
        }
        if (alertTexto) {
            alertTexto.textContent =
                err instanceof FalhaEnvio && err.motivo === "limite"
                    ? "Recebemos muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo ou"
                    : TEXTO_FALHA;
        }
        alertMsg.hidden = false;
        console.error("Envio do lead falhou:", err);
    }

    // Submeter formulário
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (enviando) return;

        const dados = lerDados();
        const erros = validar(dados);
        ORDEM_CAMPOS.forEach((nome) => setErro(nome, erros[nome]));
        const primeiroErro = ORDEM_CAMPOS.find((nome) => erros[nome]);
        if (primeiroErro) {
            focarCampo(primeiroErro);
            return;
        }

        alertMsg.hidden = true;
        setEnviando(true);
        let falha = null;
        try {
            await gravarLead(corpoDoLead(dados));
        } catch (err) {
            falha = err;
        }
        setEnviando(false);
        if (falha) {
            mostrarFalha(falha);
            return;
        }

        mostrarSucesso(dados.nome);
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "generate_lead", form_id: "leadForm" });
    });

    document.getElementById("restartBtn").addEventListener("click", () => {
        form.reset();
        telefoneDigitos = "";
        limparErros();
        corretoraField.hidden = true;
        alertMsg.hidden = true;
        sucesso.hidden = true;
        form.hidden = false;
        campos.nome.focus();
    });
})();
