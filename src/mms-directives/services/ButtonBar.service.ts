import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

export class ButtonBarApi {

  select = (parentButton, childButton) => {
    if(parentButton && childButton) {
      parentButton.dropdown_buttons.forEach((dropdownButton) => {
        dropdownButton.selected = dropdownButton.id === childButton.id;
      });
    }
  };

  setPermission = (id, permission, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id)
        button.permission = permission;
    });
  };

  setTooltip = (id, tooltip, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id)
        button.tooltip = tooltip;
    });
  };

  setIcon = (id, icon, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id)
        button.icon = icon;
    });
  };

  setToggleState = (id, state, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id) {
        if (button.togglable) {
          var original = button.toggle_state;
          if ((!original && state) || (original && !state))
            this.toggleButtonState(id, buttons);
        }
      }
    });
  };

  getToggleState = (id, buttons) => {
    var buttonTemp = {
      toggle_state: false
    };
    //buttonTemp.toggle_state = false;

    buttons.forEach((button) => {
      if (button.id === id) {
        buttonTemp = button;
        if (! button.togglable) button.toggle_state = false;
        if (! button.toggle_state) button.toggle_state = false;
      }
    });

    return buttonTemp.toggle_state;
  };

  addButton = (button, buttons) => {
    //TODO: Determine if count can actually be replaced by length here
    if (buttons.length === 0) {
      button.placement = "bottom-left";
    }
    else if (!button.placement) {
      // else {
      button.placement = "bottom";
    }

    if (button.togglable) {
      button.toggle_state = false;
      button.tooltip_orginal = button.tooltip;
    }
    button.icon_original = button.icon;

    buttons.push(button);
  };

  toggleButtonSpinner = (id, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id) {
        if (button.spinner) {
          button.icon = button.icon_original;
        }
        else {
          button.icon_original = button.icon;
          button.icon = 'fa fa-spinner fa-spin';
        }
        button.spinner = ! button.spinner;
      }
    });
  };

  toggleButtonState = (id, buttons) => {
    buttons.forEach((button) => {
      if (button.id === id) {
        if (button.togglable) {
          button.toggle_state = !button.toggle_state;
          if (button.toggle_state && button.toggle_icon && button.toggle_tooltip) {
            button.icon = button.toggle_icon;
            button.tooltip = button.toggle_tooltip;
          }
          else {
            button.icon = button.icon_original;
            button.tooltip = button.tooltip_orginal;
          }
        }
      }
    });
  };
}

buttonBarService.$inject = [];

function buttonBarService() {
  return new ButtonBarApi();
}

mmsDirectives
  .service("ButtonBarService", buttonBarService);