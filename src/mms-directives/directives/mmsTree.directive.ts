import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

let TreeComponent = {

}







mmsDirectives.directive('mmsTree', ['ApplicationService', '$timeout', '$log', '$templateCache', '$filter', 'UtilsService', 'TreeService', mmsTree]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsTree
 *
 * @requires $timeout
 * @requires $templateCache
 *
 * @restrict E
 *
 * @description
 * Outputs a tree with customizable icons for different types of nodes and callback
 * for node branch clicked. Includes api, see methods section. (the name display is
 * angular data binded)
 * Object for tree model require (can have multiple roots):
 *  <pre>
    [
        {
            label: 'root node name',
            type: 'a type',
            data: {name: 'name will be shown', ...},
            children: [{...}]
        },
        {
            label: 'another root node',
            type: 'another type',
            data: {name: 'another name', ...},
            children: [{...}]
        }
    ]
    </pre>
 * Tree options:
 *  <pre>
    {
        types: {
            'a type': 'fa fa-file-o',
            'another type': 'fa fa-file'
        }
    }
    </pre>
 *
 * ## Example 
 * ### controller (js)
 *  <pre>
    angular.module('app', ['mmsDirectives'])
    .controller('TreeCtrl', ['$scope', function($scope) {
        $scope.api = {}; //empty object to be populated by the spec api
        $scope.handler = function(branch) {
            //branch selected
        };
        $treeData = [
            {
                label: 'Root',
                type: 'Package',
                data: {
                    name: 'Root',
                    sysmlId: 'id',
                    //any other stuff
                },
                children: [
                    {
                        label: 'Child',
                        type: 'Class',
                        data: {
                            name: 'Child',
                            sysmlId: 'blah',
                            //other stuff
                        },
                        children: []
                    }
                ]
            }
        ];
        $scope.options = {
            types: {
                'Package': 'fa fa-folder',
                'Class': 'fa fa-bomb'
            }
        };
    }]);
    </pre>
 * ### template (html)
 *  <pre>
    <div ng-controller="TreeCtrl">
        <mms-tree tree-data="treeData" on-select="handler(branch)" options="options" tree-control="api"></mms-tree>
    </div>
    </pre>
 *
 * @param {Array} treeData Array of root nodes
 * @param {Object=} treeControl Empty object to populate with api
 * @param {Object=} options Options object to customize icons for types and statuses
 * @param {string='fa fa-caret-right'} iconExpand icon to use when branch is collapsed
 * @param {string='fa fa-caret-down'} iconCollapse icon to use when branch is expanded
 * @param {string='fa fa-file'} iconDefault default icon to use for nodes
 */
function mmsTree(ApplicationService, $timeout, $log, $templateCache, $filter, UtilsService, TreeService) {

    var mmsTreeLink = function(scope, element, attrs) {
        const treeApi = TreeService;
        let treeData = scope.treeData;
        
        scope.getHref = getHref;
        if (!scope.options) {
            scope.options = {
                expandLevel: 1,
                search: ''
            };
        }
        if (!attrs.iconExpand)
            attrs.iconExpand = 'fa fa-caret-right fa-lg fa-fw';
        if (!attrs.iconCollapse)
            attrs.iconCollapse = 'fa fa-caret-down fa-lg fa-fw';
        if (!attrs.iconDefault)
            attrs.iconDefault = 'fa fa-file fa-fw';
        if (!scope.options.expandLevel && scope.options.expandLevel !== 0)
            scope.options.expandLevel = 1;
        var expand_level = scope.options.expandLevel;
        if (!angular.isArray(treeData)) {
            $log.warn('treeData is not an array!');
            return;
        }

        var for_each_branch = function(func, excludeBranch?) {
            var run = function(branch, level) {
                func(branch, level);
                if (branch.children) {
                    for (var i = 0; i < branch.children.length; i++) {
                        run(branch.children[i], level + 1);
                    }
                }
            };
            var rootLevelBranches = excludeBranch ? treeData.filter(function(branch) { return branch !== excludeBranch; }) : treeData;
            rootLevelBranches.forEach(function (branch) { run(branch, 1); });
        };

        var remove_branch_impl = function (branch, singleBranch) {
            var parent_branch = get_parent(branch);
            if (!parent_branch) {
                for (var j = 0; j < treeData.length; j++) {
                    if (treeData[j].uid === branch.uid) {
                        treeData.splice(j,1);
                        break;
                    }
                }
                return;
            }
            for (var i = 0; i < parent_branch.children.length; i++) {
                if (parent_branch.children[i].uid === branch.uid) {
                    parent_branch.children.splice(i,1);
                    if (singleBranch) {
                        break;
                    }
                }
            }
        };

        var remove_branch = function (branch) {
            remove_branch_impl(branch, false);
        };

        var remove_single_branch = function (branch) {
            remove_branch_impl(branch, true);
        };

        var get_parent = function(child) {
            var parent = null;
            if (child.parent_uid) {
                for_each_branch(function(b) {
                    if (b.uid === child.parent_uid) {
                        parent = b;
                    }
                });
            }
            return parent;
        };

        var expandPathToSelectedBranch = function() {
            if (selected_branch) {
                expand_all_parents(selected_branch);
                on_treeData_change();
            }
        };

        var for_all_ancestors = function(child, fn) {
            var parent = get_parent(child);
            if (parent) {
                fn(parent);
                for_all_ancestors(parent, fn);
            }
        };

        var expand_all_parents = function(child) {
            for_all_ancestors(child, function(b) {
                if(b.expandable === true)
                {
                    scope.expandCallback({ branch: b });
                }
                b.expanded = true;
            });
        };

        var selected_branch = null;
        /**
         * @ngdoc function
         * @name mmsDirectives.directive:mmsTree#select_branch
         * @methodOf mmsDirectives.directive:mmsTree
         * 
         * @description 
         * self explanatory
         *
         * @param {Object} branch branch to select
         */
        var select_branch = function(branch, noClick?) {
            if (!branch) {
                if (selected_branch)
                    selected_branch.selected = false;
                selected_branch = null;
                return;
            }
            if (branch !== selected_branch) {
                if (selected_branch)
                    selected_branch.selected = false;
                branch.selected = true;
                selected_branch = branch;
                /*if(branch.expandable === true)
                {
                    scope.expandCallback({ branch: branch });
                }*/
                expand_all_parents(branch);
                if (!noClick) {
                    if (branch.onSelect) {
                        $timeout(function() {
                            branch.onSelect(branch);
                        });
                    } else if (scope.options.onSelect) {
                        $timeout(function() {
                            scope.options.onSelect(branch);
                        });
                    }
                }
                if (branch.data.id) {
                    $timeout(function() {
                        var el = angular.element('#tree-branch-' + branch.data.id);
                        if (!el.isOnScreen()) {
                            el.get(0).scrollIntoView();
                        }
                    }, 500, false);
                }
            // fix for when user presses browser back button
            } else {
                expand_all_parents(branch);
            }
        };

        var on_initialSelection_change = function() {
            if (scope.initialSelection) {
                for_each_branch(function(b) {
                    if (b.data.id === scope.initialSelection) {
                        select_branch(b, true);
                    }
                });
                on_treeData_change();
            }
        };

        var on_treeData_change = function() {
            for_each_branch(function(b, level) {
                if (!b.uid)
                    b.uid = '' + Math.random();
            });
            for_each_branch(function(b) {
                if (angular.isArray(b.children)) {
                    for (var i = 0; i < b.children.length; i++) {
                        var child = b.children[i];
                        child.parent_uid = b.uid;
                    }
                }
            });
            scope.treeRows = [];
            var add_branch_to_list = function(level, section, branch, visible, peNums) {
                var expand_icon = "";
                var type_icon = "";
                var aggr = branch.aggr;
                if (!aggr)
                    aggr = "";
                else
                    aggr = '-' + aggr.toLowerCase();
                var i = 0;
                if (!branch.expanded)
                    branch.expanded = false;
                if ((branch.children && branch.children.length > 0) || (branch.expandable === true)) {
                    var haveVisibleChild = false;
                    if (branch.type !== 'view' && branch.type !== 'section')
                        haveVisibleChild = true;
                    for (i = 0; i < branch.children.length; i++) {
                        if (!branch.children[i].hide) {
                            haveVisibleChild = true;
                            break;
                        }
                    }
                    if (haveVisibleChild) {
                        if (branch.expanded) {
                            expand_icon = attrs.iconCollapse;
                        } else {
                            expand_icon = attrs.iconExpand;
                        }
                    } else
                        expand_icon = "fa fa-lg fa-fw";
                } else
                    expand_icon = "fa fa-lg fa-fw";

                if (branch.loading) {
                    type_icon = "fa fa-spinner fa-spin";
                } else if (scope.options && scope.options.types && scope.options.types[branch.type.toLowerCase() + aggr]) {
                    type_icon = scope.options.types[branch.type.toLowerCase() + aggr];
                } else {
                    type_icon = attrs.iconDefault;
                }

                var number = section.join('.');
                if (branch.type === 'figure' || branch.type === 'table' || branch.type === 'equation') {
                    peNums[branch.type]++;
                    if (scope.options.numberingDepth == 0) {
                        number = peNums[branch.type];
                    } else if (section.length >= scope.options.numberingDepth) {
                        number = section.slice(0, scope.options.numberingDepth).join('.') + scope.options.numberingSeparator + peNums[branch.type];
                    } else {
                        var sectionCopy = section.slice();
                        while (sectionCopy.length < scope.options.numberingDepth) {
                            sectionCopy.push(0);
                        }
                        number = sectionCopy.join('.') + scope.options.numberingSeparator + peNums[branch.type]; 
                    }
                } else if (branch.type !== 'view' && branch.type !== 'section') {
                    number = '';
                }
                if (branch.data && branch.data.id && scope.options.sectionNumbering) {
                    branch.data._veNumber = number;
                }
                if (branch.hide)
                    visible = false;
                scope.treeRows.push({
                    level: level,
                    section: number,
                    branch: branch,
                    label: branch.label,
                    expand_icon: expand_icon,
                    visible: visible,
                    type_icon: type_icon,
                    children: branch.children
                });
                if (branch.children) {
                    var alpha = false;
                    if (scope.options.sort) {
                        branch.children.sort(scope.options.sort);
                    }
                    var j = scope.options.startChapter;
                    if (j === null || j === undefined || level != 1) {
                        j = 1;
                    }
                    for (i = 0; i < branch.children.length; i++) {
                        var child_visible = visible && branch.expanded;
                        //if (branch.children[i].type === 'section')
                        //    add_branch_to_list(level + 1, '§ ', branch.children[i], child_visible);
                        if (branch.children[i].type === 'figure' || branch.children[i].type === 'table' || branch.children[i].type === 'equation') {
                            add_branch_to_list(level + 1, section, branch.children[i], child_visible, peNums);
                        } else {
                            if (scope.options.sectionNumbering) {
                                if (branch.children[i].data._isAppendix) {
                                    alpha = true;
                                    j = 0;
                                }
                                var nextSection = section.slice(); 
                                nextSection.push(alpha ? String.fromCharCode(j + 65) : j);
                                if (nextSection.length <= scope.options.numberingDepth) {
                                    peNums.table = 0; peNums.figure = 0; peNums.equaton = 0;
                                }
                                add_branch_to_list(level + 1, nextSection, branch.children[i], child_visible, peNums);
                            } else {
                                add_branch_to_list(level + 1, [], branch.children[i], child_visible, peNums);
                            }
                            j++;
                        }
                    }
                }
            };

            if (scope.options.sort) {
                treeData.sort(scope.options.sort);
            }

            for (var i = 0; i < treeData.length; i++) {
                add_branch_to_list(1, [], treeData[i], true, {figure: 0, table: 0, equation: 0});
            }

        };

        scope.expandCallback = function(obj, e){
            if(!obj.branch.expanded && scope.options.expandCallback) {
               scope.options.expandCallback(obj.branch.data.id, obj.branch, false);
            }
            obj.branch.expanded = !obj.branch.expanded;
            if (e) {
                e.stopPropagation();
                on_treeData_change();
            }
        };

        scope.on_treeData_change = on_treeData_change;
        scope.$watch('treeData', on_treeData_change, false);
        scope.$watch('initialSelection', on_initialSelection_change);
        scope.treeRows = [];
        scope.treeFilter = $filter('uiTreeFilter');

        if (attrs.initialSelection) {
            for_each_branch(function(b) {
                if (b.data.id === attrs.initialSelection) {
                    $timeout(function() {
                        select_branch(b);
                    });
                }
            });
        }

        for_each_branch(function(b, level) {
            b.level = level;
            b.expanded = b.level <= expand_level;
        });

        // on_treeData_change();

        scope.user_clicks_branch = function(branch) {
            if (branch !== selected_branch) 
                select_branch(branch);
        };

        scope.user_dblclicks_branch = function(branch) {
            if (branch.onDblclick) {
                $timeout(function() {
                    branch.onDblclick(branch);
                });
            } else if (scope.options.onDblclick) {
                $timeout(function() {
                    scope.options.onDblclick(branch);
                });
            }
        };

        function getHref(row) {
            var data = row.branch.data;
            if (row.branch.type !== 'group' && UtilsService.isDocument(data) && !ApplicationService.getState().fullDoc) {
                var ref = data._refId ? data._refId : 'master';
                return UtilsService.PROJECT_URL_PREFIX + data._projectId + '/' + ref+ '/documents/' + data.id + '/views/' + data.id;
            }
        }
    };

    return {
        restrict: 'E',
        templateUrl: 'partials/mms-directives/mmsTree.html',
        // replace: true,
        scope: {
            treeData: '<',
            initialSelection: '@',
            treeControl: '<',
            options: '<'
        },
        link: mmsTreeLink
    };
}
