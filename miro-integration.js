Hooks.on("init", () => {
  // РЕГИСТРИРУЕМ НАСТРОЙКИ
  game.settings.register("miro-integration", "miroBoardUrl", {
    name: "Miro Board URL",
    hint: "Enter the URL of your Miro board.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register("miro-integration", "frameWidth", {
    name: "Frame Width (px)",
    hint: "Initial width of the Miro frame.",
    scope: "world",
    config: true,
    type: Number,
    default: 800,
  });

  game.settings.register("miro-integration", "frameHeight", {
    name: "Frame Height (px)",
    hint: "Initial height of the Miro frame.",
    scope: "world",
    config: true,
    type: Number,
    default: 600,
  });

  game.settings.register("miro-integration", "frameX", {
      name: "Frame X Position (px)",
      hint: "Initial X position of the Miro frame.",
      scope: "world",
      config: true,
      type: Number,
      default: 100,
    });

  game.settings.register("miro-integration", "frameY", {
      name: "Frame Y Position (px)",
      hint: "Initial Y position of the Miro frame.",
      scope: "world",
      config: true,
      type: Number,
      default: 100,
    });
});



Hooks.on("ready", () => {
    console.log("Miro Integration Module Loaded");

    // Восстанавливаем состояние окна (если оно было сохранено)
    if (game.user.getFlag("miro-integration", "windowState")) {
        MiroIntegration.restoreWindowState();
    }
});

const MiroIntegration = {
    miroFrame: null,
    header: null,
    collapseButton: null,
    overlay: null, // Добавляем overlay
    isDragging: false,
    isResizing: false,
    dragStartX: 0,
    dragStartY: 0,
    resizeStartX: 0,
    resizeStartY: 0,
    startWidth: 0,
    startHeight: 0,


    showMiroFrame() {
        const miroBoardUrl = game.settings.get("miro-integration", "miroBoardUrl");

        if (!miroBoardUrl) {
            ui.notifications.warn("Please set the Miro board URL in the module settings.");
            return;
        }

        //Проверяем, существует ли уже окно
        if (MiroIntegration.miroFrame && MiroIntegration.miroFrame.isConnected){
            MiroIntegration.miroFrame.remove();
            MiroIntegration.header.remove();
             MiroIntegration.overlay.remove(); //Удаляем оверлей
            MiroIntegration.miroFrame = null;
            MiroIntegration.header = null;
            MiroIntegration.overlay = null; //Очищаем оверлей
             return;

        }


        // Создаем заголовок
        MiroIntegration.header = document.createElement("div");
        MiroIntegration.header.classList.add("miro-integration-header");
        MiroIntegration.header.style.width = `${game.settings.get("miro-integration", "frameWidth")}px`;
        MiroIntegration.header.style.height = "40px";
        MiroIntegration.header.style.position = "absolute";
        MiroIntegration.header.style.top = `${game.settings.get("miro-integration", "frameY")}px`;
        MiroIntegration.header.style.left = `${game.settings.get("miro-integration", "frameX")}px`;
        MiroIntegration.header.style.zIndex = "100";
        MiroIntegration.header.style.cursor = "move";
        MiroIntegration.header.style.display = "flex";
        MiroIntegration.header.style.alignItems = "center";
        MiroIntegration.header.style.justifyContent = "space-between";
        MiroIntegration.header.style.padding = "0 5px";

        // === ДОБАВЛЯЕМ ТЕКСТ В ЗАГОЛОВОК ===
        const titleText = document.createTextNode("Miro Board");
        MiroIntegration.header.appendChild(titleText);
        // === КОНЕЦ ДОБАВЛЕНИЯ ТЕКСТА ===

       // Создаем кнопку сворачивания/разворачивания
        MiroIntegration.collapseButton = document.createElement("button");
        MiroIntegration.collapseButton.classList.add("collapse-button");
        MiroIntegration.collapseButton.innerHTML = `<i class="fas fa-chevron-up"></i>`;

        MiroIntegration.collapseButton.title = "Collapse/Expand";
        MiroIntegration.collapseButton.addEventListener("click", (event) => {
              event.stopPropagation();
            MiroIntegration.collapseMiroFrame();
        });
        MiroIntegration.header.appendChild(MiroIntegration.collapseButton);


        // Создаем iframe
        MiroIntegration.miroFrame = document.createElement("iframe");
        MiroIntegration.miroFrame.classList.add("miro-integration-frame");
        MiroIntegration.miroFrame.src = miroBoardUrl;
        MiroIntegration.miroFrame.style.width = `${game.settings.get("miro-integration", "frameWidth")}px`;
        MiroIntegration.miroFrame.style.height = `${game.settings.get("miro-integration", "frameHeight")}px`;
        MiroIntegration.miroFrame.style.position = "absolute";
        MiroIntegration.miroFrame.style.top = `0px`; // Внутри оверлея
        MiroIntegration.miroFrame.style.left = `0px`;// Внутри оверлея
        MiroIntegration.miroFrame.style.zIndex = "100";
        MiroIntegration.miroFrame.style.pointerEvents = "auto";

        // Создаем overlay
        MiroIntegration.overlay = document.createElement("div");
        MiroIntegration.overlay.classList.add("miro-integration-overlay");
        MiroIntegration.overlay.style.width = `${game.settings.get("miro-integration", "frameWidth")}px`;
        MiroIntegration.overlay.style.height = `${game.settings.get("miro-integration", "frameHeight")}px`;
        MiroIntegration.overlay.style.position = "absolute";
        MiroIntegration.overlay.style.top = `${game.settings.get("miro-integration", "frameY") + 40}px`; //  под заголовком
        MiroIntegration.overlay.style.left = `${game.settings.get("miro-integration", "frameX")}px`;
        MiroIntegration.overlay.appendChild(MiroIntegration.miroFrame); //Помещаем Iframe внутрь
        document.body.appendChild(MiroIntegration.overlay);
        document.body.appendChild(MiroIntegration.header);



        // Добавляем обработчики событий для перетаскивания
        MiroIntegration.header.addEventListener("mousedown", MiroIntegration.startDrag);
        window.addEventListener("mousemove", MiroIntegration.drag);
        window.addEventListener("mouseup", MiroIntegration.endDrag);

        //Добавляем обработчики событий для ресайза  к overlay
        MiroIntegration.overlay.addEventListener("mousedown", MiroIntegration.startResize);
        window.addEventListener("mousemove", MiroIntegration.resize);
        window.addEventListener("mouseup", MiroIntegration.endResize);



         //Сохраняем текущее состояние
         MiroIntegration.saveWindowState();
    },

    collapseMiroFrame() {
        if (MiroIntegration.overlay.style.display === "none") {
            MiroIntegration.overlay.style.display = "block";
            MiroIntegration.collapseButton.innerHTML = `<i class="fas fa-chevron-up"></i>`;
            MiroIntegration.overlay.style.height = `${game.settings.get("miro-integration", "frameHeight")}px`; //Восстанавливаем высоту

        } else {
            MiroIntegration.overlay.style.display = "none";
            MiroIntegration.collapseButton.innerHTML = `<i class="fas fa-chevron-down"></i>`;
            //Сохраняем высоту перед сворачиванием
            game.settings.set("miro-integration", "frameHeight", parseInt(MiroIntegration.overlay.style.height));
        }
         //Сохраняем текущее состояние
         MiroIntegration.saveWindowState();
    },

    startDrag(event) {
        MiroIntegration.isDragging = true;
        MiroIntegration.dragStartX = event.clientX - MiroIntegration.header.offsetLeft;
        MiroIntegration.dragStartY = event.clientY - MiroIntegration.header.offsetTop;
    },

    drag(event) {
        if (!MiroIntegration.isDragging) return;

        let newX = event.clientX - MiroIntegration.dragStartX;
        let newY = event.clientY - MiroIntegration.dragStartY;

        MiroIntegration.header.style.left = `${newX}px`;
        MiroIntegration.header.style.top = `${newY}px`;

        MiroIntegration.overlay.style.left = `${newX}px`;
        MiroIntegration.overlay.style.top = `${newY + 40}px`;

         //Сохраняем текущее состояние
         MiroIntegration.saveWindowState();
    },

    endDrag(event) {
        MiroIntegration.isDragging = false;
        //Сохраняем координаты
        game.settings.set("miro-integration", "frameX", parseInt(MiroIntegration.header.style.left));
        game.settings.set("miro-integration", "frameY", parseInt(MiroIntegration.header.style.top));

    },

    startResize(event) {

        //Проверять клик в правом нижнем углу больше не нужно
        MiroIntegration.isResizing = true;
        MiroIntegration.resizeStartX = event.clientX;
        MiroIntegration.resizeStartY = event.clientY;
        MiroIntegration.startWidth = parseInt(MiroIntegration.overlay.style.width, 10);
        MiroIntegration.startHeight = parseInt(MiroIntegration.overlay.style.height, 10);
        event.preventDefault(); // Предотвращаем стандартное поведение

    },
    resize(event) {
        if (!MiroIntegration.isResizing) return;

        const deltaWidth = event.clientX - MiroIntegration.resizeStartX;
        const deltaHeight = event.clientY - MiroIntegration.resizeStartY;
        //Меняем размеры оверлея
        MiroIntegration.overlay.style.width = `${MiroIntegration.startWidth + deltaWidth}px`;
        MiroIntegration.overlay.style.height = `${MiroIntegration.startHeight + deltaHeight}px`;
        MiroIntegration.header.style.width = `${MiroIntegration.startWidth + deltaWidth}px`;
        //Меняем размеры Iframe
        MiroIntegration.miroFrame.style.width = `${MiroIntegration.startWidth + deltaWidth}px`;
        MiroIntegration.miroFrame.style.height = `${MiroIntegration.startHeight + deltaHeight}px`;

        //Сохраняем текущее состояние
        MiroIntegration.saveWindowState();
    },

    endResize(event) {
        MiroIntegration.isResizing = false;
        //Сохраняем размеры
        game.settings.set("miro-integration", "frameWidth", parseInt(MiroIntegration.overlay.style.width));
        game.settings.set("miro-integration", "frameHeight", parseInt(MiroIntegration.overlay.style.height));
    },



    saveWindowState() {
      if (MiroIntegration.miroFrame && MiroIntegration.header && MiroIntegration.overlay) {
        const windowState = {
          x: parseInt(MiroIntegration.header.style.left),
          y: parseInt(MiroIntegration.header.style.top),
          width: parseInt(MiroIntegration.overlay.style.width),
          height: parseInt(MiroIntegration.overlay.style.height),
          collapsed: MiroIntegration.overlay.style.display === "none" //Сохраняем свернутость оверлея
        };
        game.user.setFlag("miro-integration", "windowState", windowState);
      }
    },

    restoreWindowState() {
      const windowState = game.user.getFlag("miro-integration", "windowState");
      if (windowState && MiroIntegration.miroFrame && MiroIntegration.header && MiroIntegration.overlay) {
        MiroIntegration.header.style.left = `${windowState.x}px`;
        MiroIntegration.header.style.top = `${windowState.y}px`;
        MiroIntegration.overlay.style.width = `${windowState.width}px`;
        MiroIntegration.overlay.style.height = `${windowState.height}px`;
        MiroIntegration.overlay.style.left = `${windowState.x}px`;
        MiroIntegration.overlay.style.top = `${windowState.y + 40}px`;
        MiroIntegration.miroFrame.style.width = `${windowState.width}px`;
        MiroIntegration.miroFrame.style.height = `${windowState.height}px`;


        if (windowState.collapsed) {
            MiroIntegration.overlay.style.display = "none";
            MiroIntegration.collapseButton.innerHTML = `<i class="fas fa-chevron-down"></i>`;
        } else {
            MiroIntegration.collapseButton.innerHTML = `<i class="fas fa-chevron-up"></i>`;
        }
      }
    }
};

// Добавляем кнопку на панель инструментов
Hooks.on("getSceneControlButtons", (controls) => {
    if (game.user.isGM) {
        controls.find(c => c.name === "token").tools.push({
            name: "miro",
            title: "Miro Board",
            icon: "fas fa-chalkboard",
            onClick: () => MiroIntegration.showMiroFrame(),
            button: true
        });
    }
});