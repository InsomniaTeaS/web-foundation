const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function enhanceDrawer({ toggle, drawer }) {
  const media = window.matchMedia("(max-width: 767px)");
  drawer.dataset.enhanced = "";

  const close = ({ restoreFocus = false } = {}) => {
    drawer.hidden = media.matches;
    drawer.inert = media.matches;
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
    if (restoreFocus && media.matches) toggle.focus();
  };

  const open = () => {
    if (!media.matches) return;
    drawer.hidden = false;
    drawer.inert = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");
    requestAnimationFrame(() => drawer.querySelector(FOCUSABLE)?.focus());
  };

  const syncViewport = () => {
    if (media.matches) {
      close();
      return;
    }

    drawer.hidden = false;
    drawer.inert = false;
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
  };

  toggle.addEventListener("click", () => {
    if (!media.matches) return;
    drawer.hidden ? open() : close({ restoreFocus: true });
  });

  drawer.addEventListener("click", (event) => {
    if (media.matches && event.target.closest("a")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (!media.matches || drawer.hidden) return;

    if (event.key === "Escape") {
      close({ restoreFocus: true });
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [...drawer.querySelectorAll(FOCUSABLE)].filter((node) => {
      return !node.hidden && node.getClientRects().length;
    });

    if (!focusable.length) {
      event.preventDefault();
      toggle.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (
      media.matches &&
      !drawer.hidden &&
      !drawer.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      close();
    }
  });

  media.addEventListener?.("change", syncViewport);
  syncViewport();

  return { open, close };
}
