import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

/** Used for annotating an element that doesn't have any commit history at all or for an element that is deleted but has commit history **/
mmsDirectives.directive('mmsAnnotation', ['$templateCache', '$rootScope', 'ViewService', 'UtilsService', mmsAnnotation]);

function mmsAnnotation($templateCache, $rootScope, ViewService, UtilsService) {
    var template = 'partials/mms-directives/mmsAnnotation.html';
    return {
        restrict: 'A',
        templateUrl: template,
        scope: {
            mmsReqOb: '<',
            mmsRecentElement: '<',
            mmsType: '<',
            mmsCfLabel: '<'
        },
        controller: ['$scope', mmsAnnotationCtrl],
        link: mmsAnnotationLink
    };

    function mmsAnnotationLink(scope, element, attrs) {
        element.on('click', function() {
            if(scope.mmsRecentElement) {
                $rootScope.$broadcast('elementSelected', scope.mmsRecentElement, scope.mmsRecentElement._commitId, true);
            }
        });

        scope.copyToClipboard = function($event) {
            UtilsService.copyToClipboard(element.find('#tooltipElementId'), $event);
        };
    }

    function mmsAnnotationCtrl($scope) {
        var displayContent;
        if ($scope.mmsRecentElement) {
            displayContent = _getContentIfElementFound($scope.mmsType, $scope.mmsRecentElement);
        } else {
            displayContent = _getContentIfElementNotFound($scope.mmsType, $scope.mmsReqOb, $scope.mmsCfLabel);
        }
        $scope.displayContent = displayContent;
    }

    function _getContentIfElementFound(type, element) {
        var AT = ViewService.AnnotationType;
        var inlineContent = '';
        var toolTipTitle;
        var toolTipContent;
        var classifierType = ViewService.getTypeFromClassifierId(element.classifierIds);

        switch (classifierType) {
            case 'ListT':
            case 'TableT':
            case 'ImageT':
            case 'ParagraphT':
            case 'SectionT':
            case 'FigureT':
                classifierType = classifierType.substring(0, classifierType.length - 1);
                break;
        }

        switch (type) {
            case AT.mmsTranscludeName:
                inlineContent = element.name;
                toolTipTitle = 'Referenced element not found';
                toolTipContent = 'Displaying last found name as placeholder.';
                break;
            case AT.mmsTranscludeDoc:
                inlineContent = element.documentation;
                toolTipTitle = 'Referenced element not found';
                toolTipContent = 'Displaying last found documentation as placeholder.';
                break;
            case AT.mmsTranscludeCom:
                inlineContent = element.documentation;
                toolTipTitle = 'Referenced comment not found.';
                toolTipContent = 'Displaying last found comment content as a placeholder.';
                break;
            case AT.mmsViewLink:
                inlineContent = element.name;
                toolTipTitle = 'Referenced view link not found';
                toolTipContent = 'Displaying last found view link as placeholder.';
                break;
            case AT.mmsTranscludeVal:
                inlineContent = _getValueForTranscludeVal(element);
                toolTipTitle = 'Referenced element not found';
                toolTipContent = 'Displaying last found value as placeholder.';
                break;
            case AT.mmsPresentationElement:
                inlineContent = element.documentation || '<span>(no text)</span>';
                toolTipTitle = 'Referenced ' + classifierType + ' not found.';
                toolTipContent = 'Displaying last found content as placeholder.';
                break;
        }

        return {
            inlineContent: inlineContent,
            toolTipTitle: toolTipTitle,
            toolTipContent: toolTipContent,
            id: element.id
        };
    }

    function _getContentIfElementNotFound(type, reqOb, cfLabel) {
        var AT = ViewService.AnnotationType;
        var inlineContent = '';
        var label = cfLabel ? '(' + cfLabel + ')' : '';
        switch (type) {
            case AT.mmsTranscludeName:
                inlineContent = 'cf name' + label + ' does not exist';
                break;
            case AT.mmsTranscludeDoc:
                inlineContent = 'cf documentation' + label + ' does not exist';
                break;
            case AT.mmsTranscludeCom:
                inlineContent = 'cf com' + label + ' does not exist';
                break;
            case AT.mmsTranscludeVal:
                inlineContent = 'cf value' + label + ' does not exist';
                break;
            case AT.mmsViewLink:
                inlineContent = 'view link does not exist';
                break;
            case AT.mmsPresentationElement:
                inlineContent = 'presentation element does not exist';
                break;
        }

        return {
            inlineContent: inlineContent,
            toolTipTitle: 'Element not found',
            toolTipContent: '',
            id: reqOb.elementId
        };
    }

    function _getValueForTranscludeVal(element) {
        var value = '';
        if (element.type === 'Property' || element.type === 'Port' ||element.type === 'Slot') {
            if (element.defaultValue) {
                value = element.defaultValue.value;
            } else if(element.value) {
                value = element.value[0].value;
            }
        }
        if (element.type === 'Constraint' && element.specification) {
            value = element.specification.value;
        }
        return value;
    }
}
