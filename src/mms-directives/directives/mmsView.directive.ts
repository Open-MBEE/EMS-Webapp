import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsView', ['Utils', 'AuthService', 'ViewService', 'ElementService', '$templateCache', 'growl', mmsView]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsView
 *
 * @requires mms.ViewService
 * @requires mms.ElementService
 * @requires $templateCache
 * @requires growl
 *
 * @restrict E
 *
 * @description
 * Given a view id, renders the view according to the json given by mms.ViewService
 * The view has a text edit mode, where transclusions can be clicked. The view's last
 * modified time and author is the latest of any transcluded element modified time.
 * For available api methods, see methods section.
 *
 * ## Example
 * ### controller (js)
 *  <pre>
    angular.module('app', ['mmsDirectives'])
    .controller('ViewCtrl', ['$scope', function($scope) {
        $scope.api = {}; //empty object to be populated by the view directive
        $scope.handler = function(elementId) {
            //element with elementId clicked in view
        };
        $scope.showComments = function() {
            $scope.api.setShowComments(true);
        };
    }]);
    </pre>
 * ### template (html)
 *  <pre>
    <div ng-controller="ViewCtrl">
        <button ng-click="showComments()">Show Comments</button>
        <mms-view mms-element-id="view_element_id" mms-project-id="view_project_id" mms-cf-clicked="handler(elementId)" mms-view-api="api"></mms-view>
    </div>
    </pre>
 * ## Example view at a certain commit
 *  <pre>
    <mms-view mms-element-id="view_element_id" mms-project-id="view_project_id" mms-commit-id="COMMIT_ID_HASH"></mms-view>
    </pre>
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 * @param {expression=} mmsCfClicked The expression to handle transcluded elements in the
 *              view being clicked, this should be a function whose argument is 'elementId'
 */

function mmsView(Utils, AuthService, ViewService, ElementService, $templateCache, growl) {
    var template = 'partials/mms-directives/mmsView.html';

    var mmsViewCtrl = function($scope) {
        $scope.presentationElemCleanUpFncs = [];

        this.isTranscludedElement = function(elementName) {
            if (elementName === 'MMS-TRANSCLUDE-COM' ||
                elementName === 'MMS-TRANSCLUDE-DOC' ||
                elementName === 'MMS-TRANSCLUDE-IMG' ||
                elementName === 'MMS-TRANSCLUDE-NAME' ||
                elementName === 'MMS-TRANSCLUDE-VAL') {
                return true;
            }
            return false;
        };

        this.isViewElement = function(elementName) {
            if (elementName === 'MMS-VIEW-IMG' ||
                elementName === 'MMS-VIEW-LIST' ||
                elementName === 'MMS-VIEW-PARA' ||
                elementName === 'MMS-VIEW-TABLE' ||
                elementName === 'MMS-VIEW-TABLE-T' ||
                elementName === 'MMS-VIEW-LIST-T' ||
                elementName === 'MMS-VIEW-EQUATION') {
                return true;
            }
            return false;
        };

        this.isPresentationElement = function(elementName) {
            if (elementName === 'MMS-VIEW-PRESENTATION-ELEM') {
                return true;
            }
            return false;
        };

        this.isEditable = function() {
            return $scope.showEdits;
        };

        this.transcludeClicked = function(elementOb) {
            if ($scope.mmsViewApi && $scope.mmsViewApi.elementClicked && elementOb)
                $scope.mmsViewApi.elementClicked(elementOb);
        };

        this.elementTranscluded = function(elem, type) {
            if (elem) {
                if (elem._modified > $scope.modified && type !== 'Comment') {
                    $scope.modified = elem._modified;
                    if (elem._modifier) {
                        AuthService.getUserData(elem._modifier).then(function(modifierData){
                                $scope.modifier = modifierData;
                        });
                    }
                }
                if ($scope.mmsViewApi && $scope.mmsViewApi.elementTranscluded)
                    $scope.mmsViewApi.elementTranscluded(elem, type);
            }
        };

        //INFO this was getWsAndVersion
        this.getElementOrigin = function() {
            return {
                projectId: $scope.mmsProjectId,
                refId: $scope.mmsRefId,
                commitId: $scope.mmsCommitId
            };
        };

        this.getView = function() {
            // scope view gets set in the viewlink fnc
            return $scope.view;
        };

        $scope.hoverIn = function() {
            $scope.isHover = true;
        };
        $scope.hoverOut = function() {
            $scope.isHover = false;
        };
    };

    var mmsViewLink = function(scope, element, attrs) {
        // Build request object
        var reqOb = {elementId: scope.mmsElementId, projectId: scope.mmsProjectId, refId: scope.mmsRefId, commitId: scope.mmsCommitId};
        var processed = false;
        scope.setPeLineVisibility = function($event) {
            window.setTimeout(function() {
                var peContainer = $($event.currentTarget).closest('.add-pe-button-container');
                if (peContainer.find('.dropdown-menu').css('display') == 'none') {
                    peContainer.find('hr').css('visibility', 'hidden');
                } else {
                    peContainer.find('hr').css('visibility', 'visible');
                }
            });
        };
        scope.isSection = false;

        var changeView = function(newVal, oldVal) {
            if (!newVal || (newVal === oldVal && processed))
                return;
            processed = true;
            element.addClass('isLoading');
            ElementService.getElement(reqOb, 1)
            .then(function(data) {
                //view accepts a section element
                if (data.type === 'InstanceSpecification') {
                    scope.isSection = true;
                }
                var operand = [];
                if (data._contents && data._contents.operand) {
                    operand = data._contents.operand;
                }
                if (data.specification && data.specification.operand) {
                    operand = data.specification.operand;
                }
                var dups = Utils.checkForDuplicateInstances(operand);
                if (dups.length > 0) {
                    growl.warning("There are duplicates in this view, dupilcates ignored!");
                }
                if (data._veNumber) {
                    scope.level = data._veNumber.split('.').length;
                }
                if (//data._numElements && data._numElements > 5000 &&
                        scope.mmsCommitId && scope.mmsCommitId !== 'latest') {
                    //threshold where getting view elements in bulk takes too long and it's not latest
                    //getting cached individual elements should be faster
                    scope.view = data;
                    scope.modified = data._modified;
                    AuthService.getUserData(data._modifier).then(function(modifierData){
                        scope.modifier = modifierData;
                    });
                    return;
                }
                ViewService.getViewElements(reqOb, 1)
                .finally(function() {
                    scope.view = data;
                    scope.modified = data._modified;
                    AuthService.getUserData(data._modifier).then(function(modifierData){
                        scope.modifier = modifierData;
                    });
                    element.removeClass('isLoading');
                });
            }, function(reason) {
                growl.error('Getting View Error: ' + reason.message + ': ' + scope.mmsElementId);
            }).finally(function() {
                if (scope.view)
                    element.removeClass('isLoading');
            });
        };
        scope.$watch('mmsElementId', changeView);
        scope.showElements = false;
        scope.showComments = false;
        scope.showEdits = false;


        /**
         * @ngdoc function
         * @name mmsDirectives.directive:mmsView#addEltAction
         * @methodOf mmsDirectives.directive:mmsView
         *
         * @description
         * Add specified element at the defined 'index'
         */
        scope.addEltAction = function (index, type) {
            if (!scope.showEdits) {
                return;
            }
            scope.addPeIndex = index;
            Utils.addPresentationElement(scope, type, scope.view);
        };

        /**
         * @ngdoc function
         * @name mmsDirectives.directive:mmsView#toggleShowElements
         * @methodOf mmsDirectives.directive:mmsView
         *
         * @description
         * toggle elements highlighting
         */
        scope.toggleShowElements = function() {
            scope.showElements = !scope.showElements;
            element.toggleClass('outline');
        };

        /**
         * @ngdoc function
         * @name mmsDirectives.directive:mmsView#toggleShowComments
         * @methodOf mmsDirectives.directive:mmsView
         *
         * @description
         * toggle comments visibility
         */
        scope.toggleShowComments = function() {
            scope.showComments = !scope.showComments;
            element.toggleClass('reviewing');
        };

        /**
         * @ngdoc function
         * @name mmsDirectives.directive:mmsView#toggleShowEdits
         * @methodOf mmsDirectives.directive:mmsView
         *
         * @description
         * toggle elements editing panel
         */
        scope.toggleShowEdits = function() {
            scope.showEdits = !scope.showEdits;
            element.toggleClass('editing');
            // Call the callback functions to clean up frames, show edits, and
            // re-open frames when needed:
            for (var i = 0; i < scope.presentationElemCleanUpFncs.length; i++) {
                scope.presentationElemCleanUpFncs[i]();
            }
        };

        if (angular.isObject(scope.mmsViewApi)) {
            var api = scope.mmsViewApi;
            api.toggleShowElements = scope.toggleShowElements;
            api.toggleShowEdits = scope.toggleShowEdits;
            api.toggleShowComments = scope.toggleShowComments;

            /**
             * @ngdoc function
             * @name mmsDirectives.directive:mmsView#setShowElements
             * @methodOf mmsDirectives.directive:mmsView
             *
             * @description
             * self explanatory
             *
             * @param {boolean} mode arg
             */
            api.setShowElements = function(mode) {
                scope.showElements = mode;
                if (mode)
                    element.addClass('outline');
                else
                    element.removeClass('outline');
            };

            /**
             * @ngdoc function
             * @name mmsDirectives.directive:mmsView#setShowComments
             * @methodOf mmsDirectives.directive:mmsView
             *
             * @description
             * self explanatory
             *
             * @param {boolean} mode arg
             */
            api.setShowComments = function(mode) {
                scope.showComments = mode;
                if (mode)
                    element.addClass('reviewing');
                else
                    element.removeClass('reviewing');
            };

            api.changeView = function(vid) {
                scope.changeView(vid);
            };

            if (api.init) {
                api.init(api);
            }
        }
    };

    return {
        restrict: 'E',
        templateUrl: template,
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsCommitId: '@',
            mmsLink: '<',
            mmsViewApi: '<'
        },
        controller: ['$scope', mmsViewCtrl],
        link: mmsViewLink
    };
}