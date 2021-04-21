import * as angular from "angular";
import { tree } from "d3";
var mmsDirectives = angular.module('mmsDirectives');

class TreeService {
  static $inject = ['$timeout'];

  private $timeout;

  private selected_branch;

  public attrs;
  public treeRows;
  
  
  constructor($timeout) {
    this.$timeout = $timeout;
    // this.treeRows = [];
    
  }

  for_each_branch = (func, treeData, excludeBranch?) => {
    var run = function(branch, level) {
        func(branch, level);
        if (branch.children) {
            for (var i = 0; i < branch.children.length; i++) {
                run(branch.children[i], level + 1);
            }
        }
    };
    var rootLevelBranches = excludeBranch ? treeData.filter((branch) => { return branch !== excludeBranch; }) : treeData;
    rootLevelBranches.forEach(function (branch) { run(branch, 1); });
  };

  on_initialSelection_change = (initialSelection, treeData, options) => {
    if (initialSelection) {
        this.for_each_branch((b) => {
            if (b.data.id === initialSelection) {
                this.select_branch(b, true, treeData, options);
            }
        }, treeData);
        this.on_treeData_change(treeData, options);
    }
  };

  on_treeData_change = (treeData, options) => {
    this.treeRows = [];
    this.for_each_branch((b, level) => {
        if (!b.uid)
            b.uid = '' + Math.random();
    }, treeData);
    this.for_each_branch((b) => {
        if (angular.isArray(b.children)) {
            for (var i = 0; i < b.children.length; i++) {
                var child = b.children[i];
                child.parent_uid = b.uid;
            }
        }
    }, treeData);
    var add_branch_to_list = (level, section, branch, visible, peNums) => {
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
                    expand_icon = this.attrs.iconCollapse;
                } else {
                    expand_icon = this.attrs.iconExpand;
                }
            } else
                expand_icon = "fa fa-lg fa-fw";
        } else
            expand_icon = "fa fa-lg fa-fw";

        if (branch.loading) {
            type_icon = "fa fa-spinner fa-spin";
        } else if (options && options.types && options.types[branch.type.toLowerCase() + aggr]) {
            type_icon = options.types[branch.type.toLowerCase() + aggr];
        } else {
            type_icon = this.attrs.iconDefault;
        }

        var number = section.join('.');
        if (branch.type === 'figure' || branch.type === 'table' || branch.type === 'equation') {
            peNums[branch.type]++;
            if (options.numberingDepth == 0) {
                number = peNums[branch.type];
            } else if (section.length >= options.numberingDepth) {
                number = section.slice(0, options.numberingDepth).join('.') + options.numberingSeparator + peNums[branch.type];
            } else {
                var sectionCopy = section.slice();
                while (sectionCopy.length < options.numberingDepth) {
                    sectionCopy.push(0);
                }
                number = sectionCopy.join('.') + options.numberingSeparator + peNums[branch.type]; 
            }
        } else if (branch.type !== 'view' && branch.type !== 'section') {
            number = '';
        }
        if (branch.data && branch.data.id && options.sectionNumbering) {
            branch.data._veNumber = number;
        }
        if (branch.hide)
            visible = false;
        var newRow = {
          level: level,
          section: number,
          branch: branch,
          label: branch.label,
          expand_icon: expand_icon,
          visible: visible,
          type_icon: type_icon,
          children: branch.children
        }
        console.log(newRow);
        this.treeRows.push(newRow);
        if (branch.children) {
            var alpha = false;
            if (options.sort) {
                branch.children.sort(options.sort);
            }
            var j = options.startChapter;
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
                    if (options.sectionNumbering) {
                        if (branch.children[i].data._isAppendix) {
                            alpha = true;
                            j = 0;
                        }
                        var nextSection = section.slice(); 
                        nextSection.push(alpha ? String.fromCharCode(j + 65) : j);
                        if (nextSection.length <= options.numberingDepth) {
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

    if (options.sort) {
      treeData.sort(options.sort);
    }

    for (var i = 0; i < treeData.length; i++) {
        add_branch_to_list(1, [], treeData[i], true, {figure: 0, table: 0, equation: 0});
    }

    //return this.treeRows;
  
  };

  expandCallback = (obj, treeData, options, e?) => {
    if(!obj.branch.expanded && options.expandCallback) {
      options.expandCallback(obj.branch.data.id, obj.branch, false);
    }
    obj.branch.expanded = !obj.branch.expanded;
    if (e) {
        e.stopPropagation();
        this.on_treeData_change(treeData, options);
    }
  };

  get_parent = (child, treeData) => {
    var parent = null;
    if (child.parent_uid) {
        this.for_each_branch((b) => {
            if (b.uid === child.parent_uid) {
                parent = b;
            }
        }, treeData);
    }
    return parent;
  };

  expandPathToSelectedBranch = (treeData, options) => {
    if (this.selected_branch) {
        this.expand_all_parents(this.selected_branch, treeData, options);
        this.on_treeData_change(treeData, options);
    }
};

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
  select_branch = (branch, treeData, options, noClick?) => {
    if (!branch) {
        if (this.selected_branch) {
            this.selected_branch.selected = false;
        }
        this.selected_branch = null;
        return;
    }
    if (branch !== this.selected_branch) {
        if (this.selected_branch) {
            this.selected_branch.selected = false;
        }
        branch.selected = true;
        this.selected_branch = branch;
        /*if(branch.expandable === true)
        {
            scope.expandCallback({ branch: branch });
        }*/
        this.expand_all_parents(branch, treeData, options);
        if (!noClick) {
            if (branch.onSelect) {
                this.$timeout(() => {
                    branch.onSelect(branch);
                });
            } else if (options.onSelect) {
                this.$timeout(() => {
                    options.onSelect(branch);
                });
            }
        }
        if (branch.data.id) {
            this.$timeout(() => {
                var el = angular.element('#tree-branch-' + branch.data.id);
                if (!el.isOnScreen()) {
                    el.get(0).scrollIntoView();
                }
            }, 500, false);
        }
    // fix for when user presses browser back button
    } else {
        this.expand_all_parents(branch, treeData, options);
    }
  };

  expand_all_parents = (child, treeData, options) => {
    this.for_all_ancestors(child, treeData, options, (b) => {
        if(b.expandable === true)
        {
            this.expandCallback({ branch: b }, treeData, options);
        }
        b.expanded = true;
    });
  };

  for_all_ancestors = (child, treeData, options, fn) => {
    var parent = this.get_parent(child, treeData);
    if (parent) {
        fn(parent);
        this.for_all_ancestors(parent, treeData, options, fn);
    }
  };

  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#expand_all
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   */
  expand_all = (treeData, options) => {
    this.for_each_branch(function(b, level) {
      this.expandCallback({ branch: b });
      b.expanded = true;
    }, treeData, options);
    this.on_treeData_change(treeData, options);
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#collapse_all
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   */
  collapse_all = (treeData, options, excludeBranch?) => {
    if (excludeBranch) {
      this.for_each_branch(function(b, level) {
        b.expanded = false;
      }, treeData, excludeBranch);
    }else {
      this.for_each_branch(function(b, level) {
        b.expanded = false;
      }, treeData);
    }
    
    this.on_treeData_change(treeData, options);
  };

  get_first_branch = (treeData) => {
    if (treeData.length > 0)
      return treeData[0];
  };
  select_first_branch = (treeData, options) => {
    var b = this.get_first_branch(treeData);
    this.select_branch(b, treeData, options);
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#get_selected_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @return {Object} current selected branch
   */
  get_selected_branch = () => {
    return this.selected_branch;
  };

  clear_selected_branch = () => {
    this.selected_branch = null;
  };

  get_parent_object = this.get_parent;
  //select_branch = this.select_branch;

  get_children = (b) => {
    return b.children;
  };
  select_parent_branch = (b, treeData, options) => {
    var p = this.get_parent_object(b, treeData);
    if (p)
      this.select_branch(p, treeData, options);
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#add_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @param {Object} parent parent branch or null
   * @param {Object} new_branch branch to add to parent or root
   */
  add_branch = function(parent, new_branch, top, treeData, options) {
    if (parent) {
      if (top)
        parent.children.unshift(new_branch);
      else
        parent.children.push(new_branch);
      parent.expanded = true;
    } else {
      if (top)
        treeData.unshift(new_branch);
      else
        treeData.push(new_branch);
    }
    this.on_treeData_change(treeData, options);
  };

  remove_branch_impl = (branch, treeData, singleBranch?) => {
    var parent_branch = this.get_parent(branch, treeData);
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

remove_branch = (branch, treeData, options) => {
    this.remove_branch_impl(branch, treeData, false);
    this.on_treeData_change(treeData, options);
};

remove_single_branch = (branch, treeData, options) => {
    this.remove_branch_impl(branch, treeData, true);
    this.on_treeData_change(treeData, options);
};

  add_root_branch = function(new_branch) {
    this.add_branch(null, new_branch);
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#expand_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @param {Object} branch branch to expand
   */
  expand_branch = (b, treeData, options) => {
    if (!b)
      b = this.get_selected_branch();
    if (b) {
      this.expandCallback({ branch: b }, treeData, options);
      b.expanded = true;
    }
    this.on_treeData_change(treeData, options);
  };

  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#collapse_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @param {Object} branch branch to collapse
   */
  collapse_branch = (b, treeData, options) => {
    if (!b)
      b = this.selected_branch;
    if (b)
      b.expanded = false;
    this.on_treeData_change(treeData, options);
  };

  get_siblings = (b, treeData) => {
    var siblings;
    var p = this.get_parent_object(b, treeData);
    if (p)
      siblings = p.children;
    else
      siblings = treeData;
    return siblings;
  };

  get_next_sibling = (b, treeData) => {
    var siblings = this.get_siblings(b, treeData);
    if (angular.isArray(siblings)) {
      var i = siblings.indexOf(b);
      if (i < siblings.length - 1)
        return siblings[i + 1];
    }
  };

  get_prev_sibling = (b, treeData) => {
    var siblings = this.get_siblings(b, treeData);
    if (angular.isArray(siblings)) {
      var i = siblings.indexOf(b);
      if (i > 0)
        return siblings[i - 1];
    }
  };
  select_next_sibling = (b, treeData, options) => {
    var next = this.get_next_sibling(b, treeData);
    if (next)
      this.select_branch(next, treeData, options);
  };

  select_prev_sibling = (b, treeData, options) => {
    var prev = this.get_prev_sibling(b, treeData);
    if (prev)
      this.select_branch(prev, treeData, options);
  };

  get_first_child = (b) => {
    if (!b)
      b = this.selected_branch;
    if (b && b.children && b.children.length > 0)
      return b.children[0];
  };
  get_closest_ancestor_next_sibling = (b, treeData) => {
    var next = this.get_next_sibling(b, treeData);
    if (next)
      return next;
    else {
      next = this.get_parent_object(b, treeData);
      return this.get_closest_ancestor_next_sibling(next, treeData);
    }
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#get_next_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @param {Object} branch current branch
   * @return {Object} next branch
   */
  get_next_branch = (b, treeData) => {
    if (!b)
      b = this.selected_branch;
    if (b) {
      var next = this.get_first_child(b);
      if (next)
        return next;
      else {
        next = this.get_closest_ancestor_next_sibling(b, treeData);
        return next;
      }
    }
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#select_next_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @param {Object} branch current branch
   */
  select_next_branch = (b, treeData, options) => {
    var next = this.get_next_branch(b, treeData);
    if (next)
      this.select_branch(next, treeData, options);
  };
  last_descendant = (b) => {
    if (b) {
      if (b.children.length === 0)
        return b;
      var last = b.children[b.children.length - 1];
      return this.last_descendant(last);
    }
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#get_prev_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @param {Object} branch current branch
   * @return {Object} previous branch
   */
  get_prev_branch = (b, treeData) => {
    var prev_sibling = this.get_prev_sibling(b, treeData);
    if (prev_sibling)
      return this.last_descendant(prev_sibling);
    return this.get_parent_object(b, treeData);
  };
  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#select_prev_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * self explanatory
   *
   * @param {Object} branch current branch
   */
  select_prev_branch = (b, treeData, options) => {
    var prev = this.get_prev_branch(b, treeData);
    if (prev)
      this.select_branch(prev, treeData, options);
  };

  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#refresh
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * rerender the tree when data or options change
   */
  refresh = (treeData, options) => {
    this.on_treeData_change(treeData, options);
  };

  initialSelect = (treeData, options) => {
    this.on_initialSelection_change("", treeData, options);
  };

  sort_branch = (b, sortFunction) => {
    b.children.sort(sortFunction);
  };

  /**
   * @ngdoc function
   * @name mmsDirectives.directive:mmsTree#get_branch
   * @methodOf mmsDirectives.directive:mmsTree
   *
   * @description
   * Returns the branch with the specified data
   */
  get_branch = (data, treeData, options) => {
    var branch = null;
    this.for_each_branch(function(b) {
      // if (angular.equals(b.data,data)) {
      //     branch = b;
      // }
      if (b.data.id === data.id) {
        branch = b;
      }
    }, treeData, options);
    return branch;
  };

  get_rows = () => {
    return this.treeRows;
  };

  user_clicks_branch = (branch, treeData, options) => {
    if (branch !== this.selected_branch) 
                this.select_branch(branch, treeData, options);;
  };

}

mmsDirectives
  .service("TreeService", TreeService);