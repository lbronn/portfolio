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

// Scroll Animations (progressive enhancement — content stays visible if JS/IO fails)
const revealTargets = document.querySelectorAll("section > div");

if ("IntersectionObserver" in window) {
  const observerOptions = { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate-fade-in-up");
        entry.target.classList.remove("opacity-0");
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealTargets.forEach((section) => {
    section.classList.add("opacity-0"); // Initial state
    observer.observe(section);
  });

  // Safety net: never leave content hidden if the observer doesn't fire
  setTimeout(() => {
    revealTargets.forEach((s) => s.classList.remove("opacity-0"));
  }, 1500);
}

// Scroll to Top Logic
const scrollTopBtn = document.getElementById("scroll-to-top");

window.addEventListener("scroll", () => {
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
const phrases = ["Software Engineer", "AI Engineer"];
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
    typeSpeed = 50;
  } else {
    typeWriterElement.textContent = currentPhrase.substring(0, charIndex + 1);
    charIndex++;
    typeSpeed = 150;
  }

  if (!isDeleting && charIndex === currentPhrase.length) {
    isDeleting = true;
    typeSpeed = 2000;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    typeSpeed = 500;
  }

  setTimeout(typeWriter, typeSpeed);
}

// Start the typewriter (run now if the DOM is already parsed)
if (document.readyState !== "loading") {
  typeWriter();
} else {
  document.addEventListener("DOMContentLoaded", typeWriter);
}
