import { enhanceDrawer } from "../lib/drawer.js";
import { debounce } from "../lib/search.js";

const toggle = document.querySelector("[data-drawer-toggle]");
const drawer = document.querySelector("[data-drawer]");

if (toggle && drawer) {
  enhanceDrawer({ toggle, drawer });
}

const directory = document.querySelector("[data-directory]");

if (directory) {
  const input = directory.querySelector("[data-directory-search]");
  const items = [...directory.querySelectorAll("[data-item]")];
  const status = directory.querySelector("[data-directory-status]");

  const apply = (value) => {
    const query = value.trim().toLowerCase();
    let visible = 0;

    for (const item of items) {
      const searchable = (item.dataset.search || item.textContent).toLowerCase();
      const match = !query || searchable.includes(query);
      item.hidden = !match;
      if (match) visible += 1;
    }

    status.textContent = `${visible} item${visible === 1 ? "" : "s"}`;

    const url = new URL(location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");

    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const initial = new URL(location.href).searchParams.get("q") || "";
  input.value = initial;
  apply(initial);
  input.addEventListener("input", debounce(() => apply(input.value), 180));
}
