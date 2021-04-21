import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


mmsApp.directive('veMenu', ['CacheService','$state','$templateCache','$sce', '$timeout', 'UtilsService',veMenu]);

/**
 * @ngdoc directive
 * @name mmsApp.directive:veMenu
 *
 * @requires mms.CacheService
 * @requires $state
 * @requires $templateCache
 * @requires $sce
 *
 * @restrict E
 *
 * @description
 * veMenu is responsible for gathering all breadcrumbs for current view and
 * displaying breadcrumbs accordingly. Breadcrumb list is truncated to
 * to fit window width.
 * veMenu is also repsonsible for gathering and displaying all projects, branches
 * and tags for selected view.
 *
 */
function veMenu(CacheService, $state, $templateCache, $sce, $timeout, UtilsService) {
    var template = 'partials/mms/veMenu.html';

    var veMenuLink = function(scope, element, attrs) {
        scope.getHrefForProject = getHrefForProject;
        scope.getHrefForBranch = getHrefForBranch;
        scope.getHrefForTag = getHrefForTag;
        scope.htmlTooltip = $sce.trustAsHtml('Branch temporarily unavailable during duplication.');
        scope.currentProject = scope.project.name;

        if (scope.ref) {
            scope.currentRef = scope.ref;
            if (scope.ref.type === 'Branch') {
                scope.currentBranch = scope.branch.name;
            } else if (scope.ref.type === 'Tag') {
                scope.currentTag = scope.tag.name;
            }
        }

        scope.updateProject = function(project) {
            if (project) {
                $state.go('project.ref', {projectId: project.id, refId: 'master', search: undefined}, {reload: true});
            }
        };
        scope.updateBranch = function(branch) {
            if (branch.status != 'creating') {
                $state.go($state.current.name, {projectId: scope.project.id, refId: branch.id, search: undefined}, {reload: true});
            }
        };
        scope.updateTag = function(tag) {
            if (tag.status != 'creating') {
                $state.go($state.current.name, {projectId: scope.project.id, refId: tag.id, search: undefined}, {reload: true});
            }
        };
        scope.refsView = function() {
            $state.go('project', {projectId: scope.project.id}, {reload: true});
        };
        scope.isRefsView = function() {
            if ( $state.includes('project') && !($state.includes('project.ref')) ) {
                return true;
            } else {
                return false;
            }
        };
        scope.$on("stomp.branchCreated", function(event, createdRef, projectId) {
            var cacheKey = ['refs', scope.project.id];
            if (CacheService.exists(cacheKey) && scope.project.id === projectId) {
                var refObs = CacheService.get(cacheKey);
                var tag = [];
                for (var i = 0; i < refObs.length; i++) {
                    if (refObs[i].type === "Tag")
                        tag.push(refObs[i]);
                }
                scope.tags = tag;
                var branches = [];
                for (var j = 0; j < refObs.length; j++) {
                    if (refObs[j].type === "Branch")
                        branches.push(refObs[j]);
                }
                scope.branches = branches;
            }
        });

        var bcrumbs = [];
        var child, parentId;
        var groups = scope.groups;
        var groupsMap = {};
        if (scope.group !== undefined) {
            for (var i = 0; i < groups.length; i++) {
                groupsMap[groups[i].id] = {id: groups[i].id, name: groups[i].name, parentId: groups[i]._parentId};
            }
            child = scope.group;
        }
        if (scope.document !== undefined) {
            child = scope.document;
        }
        if (child) {
            if (child.type === 'Package') {//child.hasOwnProperty('_id')) {
                bcrumbs.push({name: child.name, id: child.id, type: "group", alfLink: child._link, link: "project.ref.preview({documentId: 'site_' + breadcrumb.id + '_cover', search: undefined})"});
                if(child._parentId) {
                    parentId = child._parentId;
                }
            } else {
                bcrumbs.push({name: child.name, id: child.id, type: "doc", link: "project.ref.document({documentId: breadcrumb.id, search: undefined})"});
                if(child._groupId) {
                    parentId = child._groupId;
                }
            }
            if (parentId) {
                while(groupsMap[parentId] !== undefined) {
                    var id = groupsMap[parentId].id;
                    bcrumbs.push({name: groupsMap[id].name, id: id, type: "group", link: "project.ref.preview({documentId: 'site_' + breadcrumb.id + '_cover', search: undefined})"});
                    parentId = groupsMap[id].parentId;
                }
            }
            scope.breadcrumbs = bcrumbs.reverse();
            $timeout(function() {
                var eltChildren = element.children().children();
                var eltWidth = element.parent().width() - eltChildren[0].scrollWidth - eltChildren[2].scrollWidth;
                var crumbcount = scope.breadcrumbs.length;
                var liWidth = (eltWidth * 0.85)/crumbcount;
                scope.truncateStyle = {'max-width': liWidth, 'white-space': 'nowrap', 'overflow': 'hidden', 'text-overflow': 'ellipsis', 'display': 'inline-block'};
            });
        }

        function getHrefForProject(project) {
            var refId = project._refId || 'master';
            return UtilsService.PROJECT_URL_PREFIX + project.id + '/' + refId;
        }

        function getHrefForBranch(branch) {
            var res = UtilsService.PROJECT_URL_PREFIX + scope.project.id + '/' + branch.id;
            if (scope.document) {
                res += '/documents/' + scope.document.id;
            }
            if (scope.view) {
                res += '/views/' + scope.view.id;
            }
            return res;
        }

        function getHrefForTag(tag) {
            return getHrefForBranch(tag);
        }
    };

    return {
        restrict: 'E',
        templateUrl: template,
        scope: {
            org: '<mmsOrg',
            project: '<mmsProject',
            projects: '<mmsProjects',
            group: '<mmsGroup',
            groups: '<mmsGroups',
            branch: '<mmsBranch',
            ref: '<mmsRef',
            refs: '<mmsRefs',
            branches: '<mmsBranches',
            tag: '<mmsTag',
            tags: '<mmsTags',
            document: '<mmsDocument',
            view: '<mmsView'
        },
        link: veMenuLink
    };
}
