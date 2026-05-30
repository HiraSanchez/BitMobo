import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { createAccount } from "../account.js";

async function init() {
  await mountLayout({ activePath: "" });

  const form = document.getElementById("signup-form");
  const feedback = document.getElementById("signup-feedback");

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const password2 = document.getElementById("password2").value;

    if (password !== password2) {
      feedback.className = "alert alert--warn";
      feedback.textContent = "As senhas nao conferem. Digite a mesma senha nos dois campos.";
      feedback.hidden = false;
      return;
    }

    createAccount({ name, email, password });
    feedback.className = "alert alert--success";
    feedback.textContent = "Conta criada com sucesso. Voce ja pode entrar na loja.";
    feedback.hidden = false;
    form.reset();

    setTimeout(() => {
      window.location.href = "/login.html?created=1";
    }, 900);
  });
}

init().catch(console.error);
