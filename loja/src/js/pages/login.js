import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { authenticate, readAccount } from "../account.js";

async function init() {
  await mountLayout({ activePath: "" });

  const form = document.getElementById("login-form");
  const feedback = document.getElementById("login-feedback");
  const params = new URLSearchParams(window.location.search);
  const created = params.get("created");
  const rawRedirect = params.get("redirect") || "/";
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  if (created) {
    feedback.className = "alert alert--success";
    feedback.textContent = "Conta criada. Entre com o e-mail e a senha cadastrados.";
    feedback.hidden = false;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const account = authenticate(email, password);

    if (!readAccount()) {
      feedback.className = "alert alert--warn";
      feedback.textContent = "Nenhuma conta foi criada neste navegador. Cadastre-se primeiro.";
      feedback.hidden = false;
      return;
    }

    if (!account) {
      feedback.className = "alert alert--warn";
      feedback.textContent = "E-mail ou senha incorretos. Confira os dados e tente novamente.";
      feedback.hidden = false;
      return;
    }

    feedback.className = "alert alert--success";
    feedback.textContent = `Bem-vindo, ${account.name}. Redirecionando para a loja...`;
    feedback.hidden = false;

    setTimeout(() => {
      window.location.href = redirect;
    }, 800);
  });
}

init().catch(console.error);
