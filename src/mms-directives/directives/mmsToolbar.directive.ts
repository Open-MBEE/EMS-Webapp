import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');


// let mmsToolbarComponent = {
// 	selector: 'mmsToolbar', //<mms-toolbar>
// 	template: `
// 	<div class="right-toolbar">
//     <div class="toolbox">
//         <div ng-repeat="button in buttons | filter: {active: true, permission: true} | orderBy:'priority'">
//             <a class="tools {{button.id}}"
//                ng-class="{selected: button.selected, dynamic: button.dynamic, pulldown: button.pullDown}"
//                ng-click="clicked(button)" uib-tooltip="{{button.tooltip}}" tooltip-trigger="mouseenter"
//                tooltip-popup-delay="100" tooltip-placement="left" tooltip-append-to-body="true"><i
//                 class="fa {{button.icon}}"></i></a>
//         </div>
//     </div>
// </div>
// 	`,
// 	bindings: {
// 		buttons: '<',
// 		mmsTbApi: '<',
// 		onClick: '&',
// 		direction: '@'
// 	},
// 	controller: class MMSToolbar {
// 		buttons = [];
// 		mmsTbApi;
// 		onClick;
// 		direction;
// 		MMSToolbarService;

// 		constructor(buttons, onClick, direction, mmsTbApi, MMSToolbarService) {
// 			this.buttons=buttons;
// 			this.mmsTbApi=mmsTbApi;
// 			this.onClick=onClick;
// 			this.direction=direction;
// 			this.MMSToolbarService = MMSToolbarService;
// 		}

// 	}
// }

mmsDirectives.directive('mmsToolbar', ['$templateCache', '$rootScope', mmsToolbar]);

function mmsToolbar($templateCache, $rootScope)
{
	var template = 'partials/mms-directives/mmsToolbar.html';

// 	var mmsToolbarCtrl = function($scope)
// 		{
// //
// 			if ($scope.mmsTbApi) {
// 				var api = $scope.mmsTbApi;
// 			}
//
//
// 		};

	var mmsToolbarLink = function(scope, element, attrs)
		{

			scope.clicked = function(button)
			{

				if (!button.permission) {
					return;
				}
				if (!button.active) {
					return;
				}

				var toggleDecativeFlag = false;
				if (this.$root.ve_togglePane && $rootScope.mms_pane_toggleable !== false)
				{
					if (button.selected || this.$root.ve_togglePane.closed)
					{
						if (button.selected && !this.$root.ve_togglePane.closed) toggleDecativeFlag = true;
						this.$root.ve_togglePane.toggle();
					}
				}

				if (this.$root.ve_tbApi) this.$root.ve_tbApi.select(button.id);

				if (button.onClick) {
					button.onClick();
				} else if (scope.onClick) {
					scope.onClick({ button: button });
				}

				if (toggleDecativeFlag) {
					this.$root.ve_tbApi.deactivate(button.id);
				}

/*if (! button.dynamic)
            {
                scope.buttons.forEach(function(b) {
                    if (b === button) {
                        b.selected = true;
                    } else
                        b.selected = false;
                });

                // de-activate all dynamic buttons
                scope.buttons.forEach(function(b) {
                    if (b.dynamic) {
                        b.active = false;
                    }
                });

                if (button.dynamic_buttons) {
                    button.dynamic_buttons.forEach(function(b) {
                        b.active = true;
                    });
                }
            }*/

			};
		};



	return {
		restrict: 'E',
		templateUrl: template,
		//controller: ['$scope', mmsToolbarCtrl],
		link: mmsToolbarLink,
		scope: {
			buttons: '<',
			mmsTbApi: '<',
			onClick: '&',
			direction: '@'
		}
	};
}