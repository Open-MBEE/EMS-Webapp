import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');


export class ToolbarApi {

  select = (id, buttons) => {
    buttons.forEach((button) =>
    {
      if (button.id === id && button.active)
      {
        // button.selected = true;
        // $scope.clicked(button);
        if (!button.dynamic)
        {
          buttons.forEach((b) =>
          {
            b.selected = b === button;
          });

          // de-activate all dynamic buttons
          buttons.forEach((b) =>
          {
            if (b.dynamic)
            {
              b.active = false;
            }
          });

          if (button.dynamic_buttons)
          {
            button.dynamic_buttons.forEach((b) =>
            {
              b.active = true;
            });
          }
        }

      }
      //else
      // button.selected = false;
    });
  };

  deactivate = (id, buttons) => {
    buttons.forEach((button) =>
    {
      if (button.id === id)
      {
        if (button.dynamic_buttons)
        {
          // de-activate all dynamic buttons
          button.dynamic_buttons.forEach((b) =>
          {
            b.active = false;
          });
        }
      }
    });
  };

  setPermission = (id, permission, buttons) => {
    buttons.forEach((button) =>
    {
      if (button.id === id) {
        button.permission = permission;
      }
    });
  };

  setSelected = (id, selected, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id) {
        button.selected = selected;
      }
    });
  };

  setIcon = (id, icon, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id) {
        button.icon = icon;
      }
    });
  };

  addButton = (button, buttons) => {
    button.priority = buttons.length;
    buttons.push(button);
    if (button.dynamic_buttons) {
      var firstButton = true;
      button.dynamic_buttons.forEach((buttonLoop) =>
      {
        if (firstButton)
        {
          buttonLoop.pullDown = true;
          firstButton = false;
        }
        buttonLoop.priority = buttonLoop.length + 1000;
        buttons.push(buttonLoop);
      });
    }
  };

  toggleButtonSpinner = (id, buttons) => {
      buttons.forEach((button) =>
      {
        if (button.id === id)
        {
          if (button.spinner)
          {
            button.icon = button.icon_original;
          }
          else
          {
            button.icon_original = button.icon;
            button.icon = 'fa fa-spinner fa-spin';
          }
          button.spinner = !button.spinner;
        }
      });
    };

    setOptions = (id, options, buttons) =>
    {
      buttons.forEach((button) =>
      {
        if (button.id === id)
        {
          if (options.active !== null) button.active = options.active;
          if (options.icon !== null) button.icon = options.icon;
          if (options.id !== null) button.id = options.id;
          if (options.permission !== null) button.permission = options.permission;
          if (options.priority !== null) button.priority = options.priority;
          if (options.selected !== null) button.selected = options.selected;
          if (options.spinner !== null) button.spinner = options.spinner;
          if (options.tooltip !== null) button.tooltip = options.tooltip;
        }
      });
    };

}

toolbarService.$inject = [];
function toolbarService() {
  return new ToolbarApi();
}
mmsDirectives
  .service("ToolbarService", toolbarService);