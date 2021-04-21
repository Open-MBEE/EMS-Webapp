import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');
mmsDirectives.directive('mmsMention', ['$templateCache', 'MentionService', 'Utils', mmsMention]);

function mmsMention($templateCache, MentionService, Utils) {
    return {
        template: $templateCache.get('partials/mms-directives/mmsMention.html'),
        scope: {
            mmsEditor: '<',
            mmsMentionValue: '<',
            mmsMentionId: '<',
            mmsProjectId: '<',
            mmsRefId: '<'
        },
        controller: ['$scope', mmsMentionCtrl],
        link: mmsMentionLink
    };
    function mmsMentionLink(scope, element, attrs, ctrls) {}

    function mmsMentionCtrl($scope) {
        $scope.fastCfListing = MentionService.getFastCfListing($scope.mmsProjectId, $scope.mmsRefId);
        // expose this api on the controller itself so that it can be accessed by codes that use $compile service to construct this directive.
        this.selectMentionItem = selectMentionItem;
        $scope.selectMentionItem = selectMentionItem;

        function selectMentionItem($item) {
            _createCf($item);
            MentionService.handleMentionSelection($scope.mmsEditor, $scope.mmsMentionId);
        }

        function _createCf($item) {
            var tag = '<mms-cf mms-cf-type="' + $item.type + '" mms-element-id="' + $item.id + '">[cf:' + $item.name + '.' + $item.type + ']</mms-cf>';
            $scope.mmsEditor.insertHtml(tag);
            Utils.focusOnEditorAfterAddingWidgetTag($scope.mmsEditor);
        }
    }
}

// Used to sync value between input from the ckeditor and the uib-typeahead directive

mmsDirectives.directive('mmsMentionIntercept', ['$templateCache',  mmsMentionIntercept]);

function mmsMentionIntercept() {
    return {
        scope: {
            mmsMentionInterceptValue: '<'
        },
        controller: ['$scope', mmsTestingController],
        require: ['ngModel'],
        link: function(scope, el, attrs, ctls) {
            scope.$watch('mmsMentionInterceptValue', function(newV, oldV) {
                var ngModelCtrl = ctls[0];
                ngModelCtrl.$setViewValue(newV);
                ngModelCtrl.$render();
            });
        }
    };
    function mmsTestingController($scope) {}
}
