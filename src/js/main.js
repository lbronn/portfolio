// Theme Toggle Logic
const themeToggleBtn = document.getElementById("theme-toggle");
const htmlElement = document.documentElement;

themeToggleBtn.addEventListener("click", () => {
  if (htmlElement.classList.contains("dark")) {
    htmlElement.classList.remove("dark");
    localStorage.theme = "light";
  } else {
    htmlElement.classList.add("dark");
    localStorage.theme = "dark";
  }
});

// Mobile Menu Logic
const mobileMenuButton = document.querySelector(
  'button[aria-controls="mobile-menu"]'
);
const mobileMenu = document.getElementById("mobile-menu");

mobileMenuButton.addEventListener("click", () => {
  const isExpanded = mobileMenuButton.getAttribute("aria-expanded") === "true";
  mobileMenuButton.setAttribute("aria-expanded", !isExpanded);
  mobileMenu.classList.toggle("hidden");
});

// Scroll Animations
const observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.1,
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("animate-fade-in-up");
      entry.target.classList.remove("opacity-0");
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll("section > div").forEach((section) => {
  section.classList.add("opacity-0"); // Initial state
  observer.observe(section);
});

// Scroll to Top Logic
const scrollTopBtn = document.getElementById("scroll-to-top");

window.addEventListener("scroll", () => {
  // Show button when scrolled down 500px (past hero roughly)
  if (window.scrollY > 500) {
    scrollTopBtn.classList.remove("translate-y-20", "opacity-0");
    scrollTopBtn.classList.remove("pointer-events-none");
  } else {
    scrollTopBtn.classList.add("translate-y-20", "opacity-0");
    scrollTopBtn.classList.add("pointer-events-none");
  }
});

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// Typewriter Effect Logic
const typeWriterElement = document.getElementById("typewriter-text");
const phrases = ["Software Engineer", "AI Engineer", "Loyal"];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typeSpeed = 100;

function typeWriter() {
  if (!typeWriterElement) return;

  const currentPhrase = phrases[phraseIndex];

  if (isDeleting) {
    typeWriterElement.textContent = currentPhrase.substring(0, charIndex - 1);
    charIndex--;
    typeSpeed = 50; // Faster deleting
  } else {
    typeWriterElement.textContent = currentPhrase.substring(0, charIndex + 1);
    charIndex++;
    typeSpeed = 150; // Normal typing
  }

  if (!isDeleting && charIndex === currentPhrase.length) {
    isDeleting = true;
    typeSpeed = 2000; // Pause at end
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    typeSpeed = 500; // Pause before new word
  }

  setTimeout(typeWriter, typeSpeed);
}

// Start the typewriter
document.addEventListener("DOMContentLoaded", typeWriter);
