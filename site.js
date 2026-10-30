const nav = document.querySelector(".nav");
const menuButton = document.querySelector(".mobile");
const menu = document.querySelector(".nav nav");

function updateNavigation() {
  nav?.classList.toggle("scrolled", window.scrollY > 30);
}

updateNavigation();
window.addEventListener("scroll", updateNavigation, { passive: true });

menuButton?.addEventListener("click", () => {
  const isOpen = menu?.classList.toggle("open") ?? false;
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.textContent = isOpen ? "×" : "☰";
});

menu?.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  menu.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  if (menuButton) menuButton.textContent = "☰";
});

document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const answer = button.nextElementSibling;
    const shouldOpen = answer?.hidden ?? true;
    document.querySelectorAll(".faq-item p").forEach((item) => { item.hidden = true; });
    document.querySelectorAll(".faq-item button").forEach((item) => item.setAttribute("aria-expanded", "false"));
    if (answer) answer.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
  });
});
