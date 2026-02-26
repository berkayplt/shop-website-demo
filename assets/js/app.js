(function () {
  var CONTENT_PATH = "/assets/data/content.json";
  var DEFAULT_LANG = "de";
  var PAGE = document.body.getAttribute("data-page") || "home";
  var ACTIVE_NAV = {
    home: "home",
    menu: "menu",
    contact: "contact"
  };

  var dictionary = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    setCurrentYear();
    setupMobileNav();
    setActiveNav();

    dictionary = await loadDictionary();
    if (!dictionary) {
      return;
    }

    setupLanguageSwitch();
    var savedLang = window.localStorage.getItem("site_lang");
    var initialLang = dictionary[savedLang] ? savedLang : DEFAULT_LANG;
    applyLanguage(initialLang);
  }

  async function loadDictionary() {
    try {
      var response = await fetch(CONTENT_PATH, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load content.json");
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function applyLanguage(lang) {
    var safeLang = dictionary[lang] ? lang : DEFAULT_LANG;
    var copy = dictionary[safeLang];

    document.documentElement.lang = safeLang;
    window.localStorage.setItem("site_lang", safeLang);

    translateDocument(copy);
    renderDynamicSections(copy);
    updateSeo(copy);
    syncLangButtons(safeLang);
  }

  function translateDocument(copy) {
    var nodes = document.querySelectorAll("[data-i18n]");
    nodes.forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      var value = getByPath(copy, key);
      if (typeof value !== "string" && typeof value !== "number") {
        return;
      }

      var attrList = node.getAttribute("data-i18n-attr");
      if (attrList) {
        attrList.split(",").forEach(function (attrNameRaw) {
          var attrName = attrNameRaw.trim();
          if (attrName) {
            node.setAttribute(attrName, String(value));
          }
        });
      } else {
        node.textContent = String(value);
      }
    });
  }

  function renderDynamicSections(copy) {
    renderHighlights(copy);
    renderMenuPreview(copy);
    renderMenuCategories(copy);
    renderLegalLists(copy);
  }

  function renderHighlights(copy) {
    var grid = document.getElementById("highlights-grid");
    if (!grid || !copy.highlights || !Array.isArray(copy.highlights.items)) {
      return;
    }

    grid.innerHTML = copy.highlights.items
      .map(function (item, index) {
        return (
          '<article class="feature-card card-surface" data-reveal style="--delay:' +
          (index * 80 + 40) +
          'ms;">' +
          "<h3>" +
          escapeHtml(item.name) +
          "</h3>" +
          "<p>" +
          escapeHtml(item.description) +
          "</p>" +
          '<p class="price-chip">' +
          escapeHtml(item.price) +
          "</p>" +
          "</article>"
        );
      })
      .join("");

    var badges = document.getElementById("home-badges");
    if (badges && Array.isArray(copy.highlights.badges)) {
      badges.innerHTML = copy.highlights.badges
        .map(function (label) {
          return "<li>" + escapeHtml(label) + "</li>";
        })
        .join("");
    }
  }

  function renderMenuPreview(copy) {
    var grid = document.getElementById("menu-preview-grid");
    if (!grid || !copy.menu_preview || !Array.isArray(copy.menu_preview.cards)) {
      return;
    }

    grid.innerHTML = copy.menu_preview.cards
      .map(function (item, index) {
        return (
          '<article class="preview-card card-surface" data-reveal style="--delay:' +
          (index * 90 + 30) +
          'ms;">' +
          "<h3>" +
          escapeHtml(item.title) +
          "</h3>" +
          "<p>" +
          escapeHtml(item.description) +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderMenuCategories(copy) {
    var stack = document.getElementById("menu-categories");
    if (!stack || !copy.menu_page || !Array.isArray(copy.menu_page.categories)) {
      return;
    }

    stack.innerHTML = copy.menu_page.categories
      .map(function (category, catIndex) {
        var itemsHtml = Array.isArray(category.items)
          ? category.items
              .map(function (item) {
                return (
                  '<article class="menu-item">' +
                  '<div class="menu-item-top">' +
                  "<h3>" +
                  escapeHtml(item.name) +
                  "</h3>" +
                  '<span class="item-price">' +
                  escapeHtml(item.price) +
                  "</span>" +
                  "</div>" +
                  "<p>" +
                  escapeHtml(item.description) +
                  "</p>" +
                  "</article>"
                );
              })
              .join("")
          : "";

        return (
          '<section class="menu-category card-surface" data-reveal style="--delay:' +
          (catIndex * 80 + 30) +
          'ms;">' +
          "<h2>" +
          escapeHtml(category.title) +
          "</h2>" +
          "<p>" +
          escapeHtml(category.description) +
          "</p>" +
          '<div class="menu-items">' +
          itemsHtml +
          "</div>" +
          "</section>"
        );
      })
      .join("");
  }

  function renderLegalLists(copy) {
    if (!copy.legal || !copy.legal.datenschutz) {
      return;
    }

    fillList("legal-data-points", copy.legal.datenschutz.data_points);
    fillList("legal-purpose-points", copy.legal.datenschutz.purpose_points);
    fillList("legal-rights-points", copy.legal.datenschutz.rights_points);
  }

  function fillList(id, items) {
    var list = document.getElementById(id);
    if (!list || !Array.isArray(items)) {
      return;
    }

    list.innerHTML = items
      .map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      })
      .join("");
  }

  function updateSeo(copy) {
    if (!copy.meta || !copy.meta[PAGE]) {
      return;
    }

    var meta = copy.meta[PAGE];
    if (typeof meta.title === "string") {
      document.title = meta.title;
    }

    setById("meta-description", "content", meta.description);
    setById("meta-og-title", "content", meta.og_title || meta.title);
    setById("meta-og-description", "content", meta.og_description || meta.description);
    setById("meta-twitter-title", "content", meta.twitter_title || meta.title);
    setById("meta-twitter-description", "content", meta.twitter_description || meta.description);
    setById("meta-canonical", "href", meta.url);
    setById("meta-og-url", "content", meta.url);
  }

  function setById(id, attr, value) {
    if (typeof value !== "string") {
      return;
    }
    var node = document.getElementById(id);
    if (node) {
      node.setAttribute(attr, value);
    }
  }

  function setupLanguageSwitch() {
    var buttons = document.querySelectorAll(".lang-switch button[data-lang]");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var lang = button.getAttribute("data-lang");
        if (!lang) {
          return;
        }
        applyLanguage(lang);
      });
    });
  }

  function syncLangButtons(lang) {
    var buttons = document.querySelectorAll(".lang-switch button[data-lang]");
    buttons.forEach(function (button) {
      var isActive = button.getAttribute("data-lang") === lang;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setupMobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("main-nav");
    if (!toggle || !nav) {
      return;
    }

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    var links = nav.querySelectorAll("a");
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function setActiveNav() {
    var current = ACTIVE_NAV[PAGE];
    var links = document.querySelectorAll(".main-nav a[data-nav]");
    links.forEach(function (link) {
      var isActive = link.getAttribute("data-nav") === current;
      link.classList.toggle("active", isActive);
    });
  }

  function setCurrentYear() {
    var year = String(new Date().getFullYear());
    var nodes = document.querySelectorAll("[data-year]");
    nodes.forEach(function (node) {
      node.textContent = year;
    });
  }

  function getByPath(object, path) {
    if (!object || !path) {
      return undefined;
    }

    return path.split(".").reduce(function (accumulator, key) {
      if (accumulator && Object.prototype.hasOwnProperty.call(accumulator, key)) {
        return accumulator[key];
      }
      return undefined;
    }, object);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
