import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


/* Controllers */

mmsApp.controller('FullDocCtrl', ['$scope', '$rootScope', '$state', '$anchorScroll', '$location', '$timeout', '$http', 'FullDocumentService', 'ShortenUrlService',
    'hotkeys', 'growl', '_', 'MmsAppUtils', 'Utils', 'UxService', 'URLService', 'UtilsService', 'search', 'orgOb', 'projectOb', 'refOb', 'groupOb', 'documentOb',
function($scope, $rootScope, $state, $anchorScroll, $location, $timeout, $http, FullDocumentService, ShortenUrlService, hotkeys, growl, _,
    MmsAppUtils, Utils, UxService, URLService, UtilsService, search, orgOb, projectOb, refOb, groupOb, documentOb) {

    $rootScope.ve_fullDocMode = true;
    if (!$rootScope.veCommentsOn)
        $rootScope.veCommentsOn = false;
    if (!$rootScope.veElementsOn)
        $rootScope.veElementsOn = false;
    if (!$rootScope.ve_editmode)
        $rootScope.ve_editmode = false;

    $scope.search = search;
    Utils.toggleLeftPane(search);
    $scope.buttons = [];
    $scope.refOb = refOb;
    $scope.projectOb = projectOb;
    $scope.latestElement = '';
    $scope.docLibLink = '';
    $scope.bbApi = {
        init: function() {
            if (documentOb && documentOb._editable && refOb.type === 'Branch') {
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
            $scope.bbApi.addButton(UxService.getButtonBarButton('show-comments'), $scope.buttons);
            $scope.bbApi.addButton(UxService.getButtonBarButton('refresh-numbering'), $scope.buttons);
            // $scope.bbApi.addButton(UxService.getButtonBarButton('share-url'));
            $scope.bbApi.addButton(UxService.getButtonBarButton('print'), $scope.buttons);
            var exportButtons = UxService.getButtonBarButton('export');
            exportButtons.dropdown_buttons.push(UxService.getButtonBarButton("convert-pdf"), $scope.buttons);
            $scope.bbApi.addButton(exportButtons, $scope.buttons);
            $scope.bbApi.setToggleState('show-comments', $rootScope.veCommentsOn, $scope.buttons);
            $scope.bbApi.setToggleState('show-elements', $rootScope.veElementsOn, $scope.buttons);
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
        }
    };
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
    $scope.views = [];
    // api to communicate with borderlayout library
    $scope.scrollApi = {
        notifyOnScroll: notifyOnScroll,
        isScrollVisible: function(){}, // pane's directive (in borderlayout) resets this to the right function
        throttleRate: 500, // how often should the wheel event triggered
        threshold : 3000, // how far from the bottom of the page before adding more views
        frequency: 100 // how fast to add more views
    };


    var views = [];
    var view2children = {};
    var num = 1;
    var seenViewIds = {};
    view2children[documentOb.id] = [];
    var fullDocumentService;
    _createViews().then(function() {
        // The Controller codes get executed before all the directives'
        // code in its template ( full-doc.html ). As a result, use $timeout here
        // to let them finish first because in this case
        // we rely on fa-pane directive to setup isScrollVisible
        $timeout(function() {
            fullDocumentService = new FullDocumentService(views);
            fullDocumentService.addInitialViews($scope.scrollApi.isScrollVisible);
            $scope.views = fullDocumentService.viewsBuffer;
        });
    });

    _initializeDocLibLink();

    $scope.$on('mms-tree-click', function(e, branch) {
        fullDocumentService.handleClickOnBranch(branch, function() {
            $location.hash(branch.data.id);
            $anchorScroll();
        });
    });

    $scope.$on('mms-full-doc-view-deleted', function(event, deletedBranch) {
       fullDocumentService.handleViewDelete(deletedBranch);
    });

    $scope.$on('mms-new-view-added', function(event, vId, curSec, prevSibId) {
        fullDocumentService.handleViewAdd(_buildViewElement(vId, curSec), prevSibId);
    });

    $scope.$on('show-comments', function() {
        for (var i = 0; i < $scope.views.length; i++) {
            $scope.views[i].api.toggleShowComments();
        }
        $scope.bbApi.toggleButtonState('show-comments', $scope.buttons);
        $rootScope.veCommentsOn = !$rootScope.veCommentsOn;
    });

    $scope.$on('show-elements', function() {
        for (var i = 0; i < $scope.views.length; i++) {
            $scope.views[i].api.toggleShowElements();
        }
        $scope.bbApi.toggleButtonState('show-elements', $scope.buttons);
        $rootScope.veElementsOn = !$rootScope.veElementsOn;
    });

    $scope.$on('show-edits', function() {
        var i = 0;
        if (($rootScope.veElementsOn && $rootScope.ve_editmode) || (!$rootScope.veElementsOn && !$rootScope.ve_editmode) ){
            for (i = 0; i < $scope.views.length; i++) {
                $scope.views[i].api.toggleShowElements();
            }
            $scope.bbApi.toggleButtonState('show-elements', $scope.buttons);
            $rootScope.veElementsOn = !$rootScope.veElementsOn;
        }
        $scope.bbApi.toggleButtonState('show-edits', $scope.buttons);
        $rootScope.ve_editmode = !$rootScope.ve_editmode;
        for (i = 0; i < $scope.views.length; i++) {
            $scope.views[i].api.toggleShowEdits();
        }
    });

    $scope.$on('convert-pdf', function() {
        fullDocumentService.loadRemainingViews(function() {
            MmsAppUtils.printModal(documentOb, refOb, true, 3)
            .then(function(ob) {
                growl.info('Exporting as PDF file. Please wait for a completion email.',{ttl: -1});
            }, function(reason){
                growl.error("Exporting as PDF file Failed: " + reason.message);
            });
        });
    });

    $scope.$on('print', function() {
        fullDocumentService.loadRemainingViews(function() {
            MmsAppUtils.printModal(documentOb, refOb, true, 1);
        });
    });

    $scope.$on('word', function() {
        fullDocumentService.loadRemainingViews(function() {
            MmsAppUtils.printModal(documentOb, refOb, true, 2)
            .then(function(ob) {
                growl.info('Exporting as Word file. Please wait for a completion email.',{ttl: -1});
            }, function(reason){
                growl.error("Exporting as Word file Failed: " + reason.message);
            });
        });
    });

    $scope.$on('tabletocsv', function() {
        fullDocumentService.loadRemainingViews(function() {
            MmsAppUtils.tableToCsv(true);
        });
    });

    $scope.$on('refresh-numbering', function() {
        fullDocumentService.loadRemainingViews(function() {
            MmsAppUtils.refreshNumbering($rootScope.ve_treeApi.get_rows(), angular.element("#print-div"));
        });
    });

    // Share URL button settings
    $scope.dynamicPopover = ShortenUrlService.dynamicPopover;
    $scope.copyToClipboard = ShortenUrlService.copyToClipboard;
    $scope.handleShareURL = ShortenUrlService.getShortUrl.bind(null, $location.absUrl(), $scope);

    function _createViews() {
        var loadingViewsFromServer = growl.info('Loading data from server!', {ttl: -1});
        views.push({id: documentOb.id, api: {
            init: function(dis) {
                if ($rootScope.veCommentsOn) {
                    dis.toggleShowComments();
                }
                if ($rootScope.veElementsOn) {
                    dis.toggleShowElements();
                }
                if ($rootScope.ve_editmode) {
                    dis.toggleShowEdits();
                }
            },
            elementTranscluded: _elementTranscluded,
            elementClicked: _elementClicked
        }});
        if (!documentOb._childViews) {
            documentOb._childViews = [];
        }
        return MmsAppUtils.handleChildViews(documentOb, 'composite', undefined, projectOb.id, refOb.id, _handleSingleView, _handleChildren)
            .then(function(childIds) {
                for (var i = 0; i < childIds.length; i++) {
                    _constructViews(childIds[i], num);
                    num = num + 1;
                }
            }).finally(loadingViewsFromServer.destroy);
    }

    function _initializeDocLibLink() {
        if (groupOb !== null) {
            $scope.docLibLink = groupOb._link;
        } else if (documentOb !== null && documentOb._groupId !== undefined && documentOb._groupId !== null) {
            $scope.docLibLink = '/share/page/repository#filter=path|/Sites/' + orgOb.id + '/documentLibrary/' +
                projectOb.id + '/' + documentOb._groupId;
        } else {
            $scope.docLibLink = '/share/page/repository#filter=path|/Sites/' + orgOb.id + '/documentLibrary/' +
                projectOb.id;
        }
    }

    function _elementTranscluded(elementOb, type) {
        if (elementOb && type !== 'Comment') {
            if (elementOb._modified > $scope.latestElement)
                $scope.latestElement = elementOb._modified;
        }
    }

    function _elementClicked(elementOb) {
        $rootScope.$broadcast('elementSelected', elementOb, 'latest');
    }

    function _buildViewElement(vId, curSec) {
        return {id: vId, api: {
            init: function(dis) {
                if ($rootScope.veCommentsOn) {
                    dis.toggleShowComments();
                }
                if ($rootScope.veElementsOn) {
                    dis.toggleShowElements();
                }
                if ($rootScope.ve_editmode) {
                    dis.toggleShowEdits();
                }
            },
            elementTranscluded: _elementTranscluded,
            elementClicked: _elementClicked
        }, number: curSec, topLevel: (curSec ? (curSec.toString().indexOf('.') === -1) : false), first: curSec == 1};
    }

    function _constructViews(viewId, curSection) {
        views.push(_buildViewElement(viewId, curSection));

        if (view2children[viewId]) {
            var num = 1;
            for (var i = 0; i < view2children[viewId].length; i++) {
                _constructViews(view2children[viewId][i], curSection + '.' + num);
                num = num + 1;
            }
        }
    }

    function _handleSingleView(v, aggr) {
        var childIds = view2children[v.id];
        if (!childIds) {
            childIds = [];
        }
        view2children[v.id] = childIds;
        if (!v._childViews || v._childViews.length === 0 || aggr === 'none') {
            return childIds;
        }
        for (var i = 0; i < v._childViews.length; i++) {
            if (seenViewIds[v._childViews[i].id]) {
                continue;
            }
            seenViewIds[v._childViews[i].id] = true;
            childIds.push(v._childViews[i].id);
        }
        return childIds;
    }

    function _handleChildren(childIds, childNodes) {
        return childIds;
    }

    function notifyOnScroll() {
        return fullDocumentService.handleDocumentScrolling();
    }
}]);
