import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


/* Controllers */

mmsApp.controller('ViewCtrl', ['$scope', '$rootScope', '$state', '$timeout', '$window', '$location',
    '$http', '$element', 'growl', 'hotkeys', 'MmsAppUtils', 'UxService', 'URLService', 'UtilsService', 'ShortenUrlService', 'Utils',
    'search', 'orgOb', 'projectOb', 'refOb', 'groupOb', 'documentOb', 'viewOb',
    function($scope, $rootScope, $state, $timeout, $window, $location, $http,
             $element, growl, hotkeys, MmsAppUtils, UxService, URLService, UtilsService, ShortenUrlService, Utils,
             search, orgOb, projectOb, refOb, groupOb, documentOb, viewOb) {

    function isPageLoading() {
        if ($element.find('.isLoading').length > 0) {
            growl.warning("Still loading!");
            return true;
        }
        return false;
    }

    $scope.vidLink = false; //whether to have go to document link
    if ($state.includes('project.ref.preview') && viewOb && viewOb.id.indexOf('_cover') < 0) {
        $scope.vidLink = true;
    }

    if (!$rootScope.veCommentsOn)
        $rootScope.veCommentsOn = false;
    if (!$rootScope.veElementsOn)
        $rootScope.veElementsOn = false;
    if (!$rootScope.ve_editmode)
        $rootScope.ve_editmode = false;

    $scope.search = search;
    Utils.toggleLeftPane(search);
    $scope.viewOb = viewOb;
    $scope.projectOb = projectOb;
    $scope.refOb = refOb;

    $scope.buttons = [];
    $scope.viewApi = {
        init: function() {
            if ($rootScope.veCommentsOn) {
                $scope.viewApi.toggleShowComments();
            }
            if ($rootScope.veElementsOn) {
                $scope.viewApi.toggleShowElements();
            }
            if ($rootScope.ve_editmode) {
                $scope.viewApi.toggleShowEdits();
            }
        },
        elementTranscluded: function(elementOb, type) {
            if (type === 'Comment' && !$scope.comments.map.hasOwnProperty(elementOb.id)) {
                $scope.comments.map[elementOb.id] = elementOb;
                $scope.comments.count++;
                if (elementOb._modified > $scope.comments.lastCommented) {
                    $scope.comments.lastCommented = elementOb._modified;
                    $scope.comments.lastCommentedBy = elementOb._modifier;
                }
            }
        },
        elementClicked: function(elementOb) {
            $rootScope.$broadcast('elementSelected', elementOb, 'latest');
        }
    };
    $scope.comments = {
        count: 0,
        lastCommented: '',
        lastCommentedBy: '',
        map: {}
    };

    $scope.docLibLink = '';
    if (groupOb !== null) {
        $scope.docLibLink = groupOb._link;
    } else if (documentOb !== null && documentOb._groupId !== undefined && documentOb._groupId !== null) {
        $scope.docLibLink = '/share/page/repository#filter=path|/Sites/' + orgOb.id + '/documentLibrary/' +
        projectOb.id + '/' + documentOb._groupId;
    } else {
        $scope.docLibLink = '/share/page/repository#filter=path|/Sites/' + orgOb.id + '/documentLibrary/' +
        projectOb.id;
    }

    $scope.bbApi = {
        init: function() {
            if (viewOb && viewOb._editable && refOb.type === 'Branch') {
                $scope.bbApi.addButton(UxService.getButtonBarButton('show-edits'), $scope.buttons);
                $scope.bbApi.setToggleState('show-edits', $rootScope.ve_editmode, $scope.buttons);
                hotkeys.bindTo($scope)
                .add({
                    combo: 'alt+d',
                    description: 'toggle edit mode',
                    callback: function() {$scope.$broadcast('show-edits');}
                });
            }
            $scope.bbApi.addButton(UxService.getButtonBarButton('show-elements'), $scope.buttons);
            $scope.bbApi.setToggleState('show-elements', $rootScope.veElementsOn, $scope.buttons);
            $scope.bbApi.addButton(UxService.getButtonBarButton('show-comments'), $scope.buttons);
            $scope.bbApi.setToggleState('show-comments', $rootScope.veCommentsOn, $scope.buttons);

            // Set hotkeys for toolbar
            hotkeys.bindTo($scope)
            .add({
                combo: 'alt+c',
                description: 'toggle show comments',
                callback: function() {$scope.$broadcast('show-comments');}
            }).add({
                combo: 'alt+e',
                description: 'toggle show elements',
                callback: function() {$scope.$broadcast('show-elements');}
            });

            if ($state.includes('project.ref.preview') || $state.includes('project.ref.document')) {
                $scope.bbApi.addButton(UxService.getButtonBarButton('refresh-numbering'), $scope.buttons);
                // $scope.bbApi.addButton(UxService.getButtonBarButton('share-url'), $scope.buttons);
                $scope.bbApi.addButton(UxService.getButtonBarButton('print'), $scope.buttons);
                if ($state.includes('project.ref.document')) {
                    var exportButtons = UxService.getButtonBarButton('export');
                    exportButtons.dropdown_buttons.push(UxService.getButtonBarButton("convert-pdf"), $scope.buttons);
                    $scope.bbApi.addButton(exportButtons, $scope.buttons);
                    $scope.bbApi.addButton(UxService.getButtonBarButton('center-previous'), $scope.buttons);
                    $scope.bbApi.addButton(UxService.getButtonBarButton('center-next'), $scope.buttons);
                    // Set hotkeys for toolbar
                    hotkeys.bindTo($scope)
                    .add({
                        combo: 'alt+.',
                        description: 'next',
                        callback: function() {$scope.$broadcast('center-next');}
                    }).add({
                        combo: 'alt+,',
                        description: 'previous',
                        callback: function() {$scope.$broadcast('center-previous');}
                    });
                } else {
                    $scope.bbApi.addButton(UxService.getButtonBarButton('export'), $scope.buttons);
                }
            }
        }
    };

    $scope.$on('show-comments', function() {
        $scope.viewApi.toggleShowComments();
        $scope.bbApi.toggleButtonState('show-comments', $scope.buttons);
        $rootScope.veCommentsOn = !$rootScope.veCommentsOn;
    });

    $scope.$on('show-elements', function() {
        $scope.viewApi.toggleShowElements();
        $scope.bbApi.toggleButtonState('show-elements', $scope.buttons);
        $rootScope.veElementsOn = !$rootScope.veElementsOn;
    });

    $scope.$on('show-edits', function() {
        if( ($rootScope.veElementsOn && $rootScope.ve_editmode) || (!$rootScope.veElementsOn && !$rootScope.ve_editmode) ){
            $scope.viewApi.toggleShowElements();
            $scope.bbApi.toggleButtonState('show-elements', $scope.buttons);
            $rootScope.veElementsOn = !$rootScope.veElementsOn;
        }
        $scope.viewApi.toggleShowEdits();
        $scope.bbApi.toggleButtonState('show-edits', $scope.buttons);
        $rootScope.ve_editmode = !$rootScope.ve_editmode;
    });

    $scope.$on('center-previous', function() {
        var prev = $rootScope.ve_treeApi.get_prev_branch($rootScope.ve_treeApi.get_selected_branch());
        if (!prev)
            return;
        while (prev.type !== 'view' && prev.type !== 'section') {
            prev = $rootScope.ve_treeApi.get_prev_branch(prev);
            if (!prev)
                return;
        }
        $scope.bbApi.toggleButtonSpinner('center-previous', $scope.buttons);
        $rootScope.ve_treeApi.select_branch(prev);
        $scope.bbApi.toggleButtonSpinner('center-previous', $scope.buttons);
    });

    $scope.$on('center-next', function() {
        var next = $rootScope.ve_treeApi.get_next_branch($rootScope.ve_treeApi.get_selected_branch());
        if (!next)
            return;
        while (next.type !== 'view' && next.type !== 'section') {
            next = $rootScope.ve_treeApi.get_next_branch(next);
            if (!next)
                return;
        }
        $scope.bbApi.toggleButtonSpinner('center-next', $scope.buttons);
        $rootScope.ve_treeApi.select_branch(next);
        $scope.bbApi.toggleButtonSpinner('center-next', $scope.buttons);
    });

    // Share URL button settings
    $scope.dynamicPopover = ShortenUrlService.dynamicPopover;
    $scope.copyToClipboard = ShortenUrlService.copyToClipboard;
    $scope.handleShareURL = ShortenUrlService.getShortUrl.bind(null, $location.absUrl(), $scope);

    if (viewOb && $state.includes('project.ref')) {
        $timeout(function() {
            $rootScope.$broadcast('viewSelected', viewOb, 'latest');
        }, 1000);
    }

    $scope.searchOptions = {
        emptyDocTxt: 'This field is empty.',
        searchInput: search,
        getProperties: true,
        closeable: true,
        callback: function(elementOb) {
            $rootScope.$broadcast('elementSelected', elementOb, 'latest');
            if ($rootScope.ve_togglePane && $rootScope.ve_togglePane.closed)
                $rootScope.ve_togglePane.toggle();
        },
        relatedCallback: function (doc, view, elem) {//siteId, documentId, viewId) {
            $state.go('project.ref.document.view', {projectId: doc._projectId, documentId: doc.id, viewId: view.id, refId: doc._refId, search: undefined});
        }
    };

    $scope.$on('convert-pdf', function() {
        if (isPageLoading())
            return;
        MmsAppUtils.printModal(viewOb, refOb, false, 3)
        .then(function(ob) {
            growl.info('Exporting as PDF file. Please wait for a completion email.',{ttl: -1});
        }, function(reason){
            growl.error("Exporting as PDF file Failed: " + reason.message);
        });
    });

    $scope.$on('print', function() {
        if (isPageLoading())
            return;
        MmsAppUtils.printModal(viewOb, refOb, false, 1);
    });

    $scope.$on('word', function() {
        if (isPageLoading())
            return;
        MmsAppUtils.printModal(viewOb, refOb, false, 2)
        .then(function(ob) {
            growl.info('Exporting as Word file. Please wait for a completion email.',{ttl: -1});
        }, function(reason){
            growl.error("Exporting as Word file Failed: " + reason.message);
        });
    });

    $scope.$on('tabletocsv', function() {
        if (isPageLoading())
            return;
        MmsAppUtils.tableToCsv(false);
    });

    $scope.$on('refresh-numbering', function() {
        if (isPageLoading())
            return;
        var printElementCopy = angular.element("#print-div");
        MmsAppUtils.refreshNumbering($rootScope.ve_treeApi.get_rows(), printElementCopy);
    });
}]);
