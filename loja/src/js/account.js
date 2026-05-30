const ACCOUNT_KEY = "bitmobo:account:v1";
const SESSION_KEY = "bitmobo:session:v1";

function encodePassword(value) {
  return btoa(unescape(encodeURIComponent(String(value || ""))));
}

export function readAccount() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
  } catch {
    return null;
  }
}

export function createAccount({ name, email, password }) {
  const account = {
    name: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    passwordHash: encodePassword(password),
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  return account;
}

export function authenticate(email, password) {
  const account = readAccount();
  if (!account) return null;

  const sameEmail = account.email === String(email || "").trim().toLowerCase();
  const samePassword = account.passwordHash === encodePassword(password);
  if (!sameEmail || !samePassword) return null;

  const session = {
    name: account.name,
    email: account.email,
    loggedAt: new Date().toISOString()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("bitmobo:auth-updated"));
}

export function clearAccount() {
  localStorage.removeItem(ACCOUNT_KEY);
  localStorage.removeItem(SESSION_KEY);
}
