// Máscara de telefone
document.getElementById("telefone").addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length > 11) {
        value = value.slice(0, 11);
    }
    if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    }
    if (value.length > 7) {
        value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    }

    e.target.value = value;
});

// Mostrar/ocultar campo de corretora
document.querySelectorAll('input[name="corretor"]').forEach((radio) => {
    radio.addEventListener("change", function () {
        const corretoraField = document.getElementById("corretoraField");
        if (this.value === "sim") {
            corretoraField.classList.remove("hidden");
            corretoraField.querySelector("input").required = true;
        } else {
            corretoraField.classList.add("hidden");
            corretoraField.querySelector("input").required = false;
        }
    });
});

async function sendLeadToN8N(data) {
  const tokenResponse = await fetch('http://localhost:3000/token');
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw new Error('Erro ao obter token');
  }

  const token = tokenData.token;

  const response = await fetch('http://localhost:3000/send-lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ${response.status}: ${errorText}`);
  }

  return true;
}

// Submeter formulário
document
    .getElementById("leadForm")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const submitBtn = document.getElementById("submitBtn");
        const originalText = submitBtn.textContent;

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const corretor = document.querySelector(
            'input[name="corretor"]:checked'
        )?.value;
        const corretora = document.getElementById("corretora").value.trim();

        if (!nome || !email || !telefone || !corretor) {
            alert("⚠️ Preencha todos os campos obrigatórios!");
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = "ENVIANDO...";

            await sendLeadToN8N({
                nome,
                email,
                telefone,
                corretor,
                corretora,
                origem: "RE/MAX - Landing Page Carreira",
            });

            document.getElementById("ebooksModal").classList.add("active");

            this.reset();
            document.getElementById("corretoraField").classList.add("hidden");
            document.getElementById("corretora").required = false;
        } catch (err) {
            console.error("❌ Erro ao enviar:", err);
            alert("❌ Erro ao enviar. Tente novamente.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

function closeModal() {
    document.getElementById("ebooksModal").classList.remove("active");
}

function downloadEbook(tipo) {
    const ebookLink =
        "https://drive.google.com/file/d/12DlFGam5224WkWcAWoGxW6oHfyHZh6IZ/view?usp=drive_link";
    window.open(ebookLink, "_blank");

    setTimeout(() => {
        closeModal();
    }, 1000);
}

document
    .getElementById("ebooksModal")
    .addEventListener("click", function (e) {
        if (e.target === this) {
            closeModal();
        }
    });

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

});
