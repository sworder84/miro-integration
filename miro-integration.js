class MiroIntegration {

    static miroFrame = null;
    static miroButton = null;

    static async initialize() {
        // Регистрация настроек модуля (если нужны)
        MiroIntegration.registerSettings();

        // Добавление хука для отрисовки панели управления сценой
        Hooks.on("getSceneControlButtons", (controls) => {
            MiroIntegration.addSceneControlButton(controls);
        });

        // Хук, срабатывающий при готовности сцены
        Hooks.on("canvasReady", async () => {
            if (MiroIntegration.miroFrame && canvas.scene.getFlag("miro-integration", "isOpen")) {
                MiroIntegration.showMiroFrame();
            }
        });
    }

    static registerSettings() {
        game.settings.register("miro-integration", "miroBoardUrl", {
            name: "Miro Board URL",
            hint: "Enter the URL of the Miro board you want to embed.",
            scope: "world", // Настройки, специфичные для мира
            config: true,   // Отображать в меню настроек
            type: String,
            default: "",    // Значение по умолчанию
            onChange: value => { // Callback when the setting changes.
                if(MiroIntegration.miroFrame)
                {
                    MiroIntegration.miroFrame.src = value;
                }
            }
        });

        game.settings.register("miro-integration", "frameWidth", {
            name: "Frame Width",
            hint: "Set the width of the Miro frame (in pixels).",
            scope: "world",
            config: true,
            type: Number,
            default: 800,
            onChange: value => {
                 if(MiroIntegration.miroFrame)
                {
                    MiroIntegration.miroFrame.style.width = `${value}px`;
                }
            }
        });

      game.settings.register("miro-integration", "frameHeight", {
            name: "Frame Height",
            hint: "Set the height of the Miro frame (in pixels).",
            scope: "world",
            config: true,
            type: Number,
            default: 600,
          onChange: value => {
                 if(MiroIntegration.miroFrame)
                {
                    MiroIntegration.miroFrame.style.height = `${value}px`;
                }
            }
        });
      game.settings.register("miro-integration", "frameX", {
            name: "Frame X",
            hint: "Set start x position of the Miro frame (in pixels).",
            scope: "world",
            config: true,
            type: Number,
            default: 100,
            onChange: value => {
                 if(MiroIntegration.miroFrame)
                {
                    MiroIntegration.miroFrame.style.left = `${value}px`;
                }
            }
        });
      game.settings.register("miro-integration", "frameY", {
            name: "Frame Y",
            hint: "Set start y position of the Miro frame (in pixels).",
            scope: "world",
            config: true,
            type: Number,
            default: 100,
            onChange: value => {
                 if(MiroIntegration.miroFrame)
                {
                    MiroIntegration.miroFrame.style.top = `${value}px`;
                }
            }
        });

        game.settings.register("miro-integration", "autoOpen", {
            name: "Auto Open",
            hint: "Automatically open the Miro frame when the scene loads.",
            scope: "world",
            config: true,
            type: Boolean,
            default: false,
             onChange: value => {
                 if (canvas.scene && value) {
                      MiroIntegration.showMiroFrame();
                }
            }

        });
    }

    static addSceneControlButton(controls) {
        let sceneControls = controls.find(c => c.name === "token"); // Добавляем к токенам, можно поменять
        if (sceneControls) {
            sceneControls.tools.push({
                name: "miro",
                title: "Toggle Miro Board",
                icon: "fas fa-brain", // Иконка FontAwesome (можешь выбрать другую)
                onClick: () => MiroIntegration.toggleMiroFrame(),
                button: true
            });
        }
    }


    static async toggleMiroFrame() {
        if (MiroIntegration.miroFrame) {
            MiroIntegration.hideMiroFrame();
        } else {
            await MiroIntegration.showMiroFrame();
        }
    }

     static async showMiroFrame() {
        if (MiroIntegration.miroFrame) return; // Already shown.
        let miroBoardUrl = game.settings.get("miro-integration", "miroBoardUrl");

         if (!miroBoardUrl) {
             ui.notifications.warn("Please set the Miro Board URL in the module settings.");
             return;
         }


        MiroIntegration.miroFrame = document.createElement("iframe");
        MiroIntegration.miroFrame.src = miroBoardUrl;
        MiroIntegration.miroFrame.style.width = `${game.settings.get("miro-integration", "frameWidth")}px`;
        MiroIntegration.miroFrame.style.height = `${game.settings.get("miro-integration", "frameHeight")}px`;
        MiroIntegration.miroFrame.style.position = "absolute";
        MiroIntegration.miroFrame.style.top = `${game.settings.get("miro-integration", "frameY")}px`;
        MiroIntegration.miroFrame.style.left = `${game.settings.get("miro-integration", "frameX")}px`;
        MiroIntegration.miroFrame.style.border = "2px solid black";
        MiroIntegration.miroFrame.style.zIndex = "100"; // Make sure it's on top
         MiroIntegration.miroFrame.style.pointerEvents = "auto";

         // Добавляем обработчики событий для drag and drop
         MiroIntegration.miroFrame.addEventListener('mousedown', MiroIntegration.startDrag, false);

        document.body.appendChild(MiroIntegration.miroFrame);
        await canvas.scene.setFlag("miro-integration", "isOpen", true);

    }

    static hideMiroFrame() {
        if (MiroIntegration.miroFrame) {
            document.body.removeChild(MiroIntegration.miroFrame);
            MiroIntegration.miroFrame = null;
            canvas.scene.unsetFlag("miro-integration", "isOpen");
        }
    }
    static startDrag(e) {
        if (e.target !== MiroIntegration.miroFrame) return;

        e.preventDefault();

        let offsetX = e.clientX - MiroIntegration.miroFrame.offsetLeft;
        let offsetY = e.clientY - MiroIntegration.miroFrame.offsetTop;

        function doDrag(e) {
             e.preventDefault();
            MiroIntegration.miroFrame.style.left = (e.clientX - offsetX) + 'px';
            MiroIntegration.miroFrame.style.top = (e.clientY - offsetY) + 'px';
        }

        function stopDrag() {
            document.removeEventListener('mousemove', doDrag, false);
            document.removeEventListener('mouseup', stopDrag, false);

             game.settings.set("miro-integration", "frameX", MiroIntegration.miroFrame.offsetLeft);
            game.settings.set("miro-integration", "frameY", MiroIntegration.miroFrame.offsetTop);
        }

        document.addEventListener('mousemove', doDrag, false);
        document.addEventListener('mouseup', stopDrag, false);
    }

}

Hooks.on("init", () => {
    MiroIntegration.initialize();
});