
//protractor test case
var MMSApp = function() {
    this.rightPane = $('div.pane-right');
    this.previewInfo = this.rightPane.all(by.tagName('h3'));
    this.editViaRightPane = element(by.tagName('mms-spec')).all(by.tagName('button'));
    this.crossReferenceInput = $('div.transclude-modal-input').element(by.tagName('input'));
    this.crossReferenceButton = $('div.transclude-modal-input').element(by.tagName('button'));
    this.crossReferenceLink = $('div.modal-content').all(by.tagName('a'));
    // this.crossReference = $();
    //not working: this.toggleRightPane = this.rightPane.$('div.fa-pane-toggle');

    //buttons: left, then top right, then far right
    this.leftButtons = $('.pane-left-btn-group').all(by.tagName('a'));
    this.centerButtons = $('.pane-center-btn-group').all(by.tagName('a'));
    this.toolButtons = element(by.tagName('mms-toolbar')).all(by.tagName('a'));
    
    //buttons on right nav bar
    this.navBar = element(by.tagName('mms-nav')).$('.nav-btns-main'); 
    this.navBarButtons = this.navBar.all(by.tagName('li'));
    this.dashboardButton = $('.fa-dashboard');
    this.masterIcon = $('a[ui-sref = "workspace"]');
    this.supportIcon = $('.support-btn');
    this.feedbackIcon = $('.portal-btn');
    
    //buttons that appear when a pop-up for adding or deleting something
    this.addOkButton = $('div.modal-footer').$('button.btn-success');
    this.addCancelButton = $('div.modal-footer').$('button.btn-danger');
    this.deleteOkButton = this.addOkButton;
    this.deleteCancelButton = this.addCancelButton;

    //inputs that you can sendKeys to when adding something
    this.addWorkspaceNameInput = element(by.model('workspace.name'));
    this.addTagNameInput = element(by.model('configuration.name'));
    this.addDocumentNameInput = element(by.model('doc.name'));
    this.addViewNameInput = element(by.model('newView.name'));

    //buttons on left when in workspace view
    this.expandAllButton = this.leftButtons.get(0);
    this.collapseAllButton = this.leftButtons.get(1);
    this.filterButton = this.leftButtons.get(2);
    this.addWorkspaceButton = this.leftButtons.get(3);
    this.addTagButton = this.leftButtons.get(4);
    this.workspaceTagDeleteButton = this.leftButtons.get(5);
    this.mergeWorkspaceButton = this.leftButtons.get(6);

    //buttons on left when in doc view
    this.addViewButton = this.leftButtons.get(2);
    this.deleteViewButton = this.leftButtons.get(3);
    this.reorderViews = this.leftButtons.get(4);
    this.fullDocument = this.leftButtons.get(5);

    //buttons on left when in sites and docs view
    this.addDocumentButton = this.leftButtons.get(3);
    this.showAlfrescoSitesButton = this.leftButtons.get(4);

    //buttons on right when in workspace view
    this.previewElement = this.toolButtons.get(0);
    this.editElement = this.toolButtons.get(1);
    this.saveAll = this.toolButtons.get(2);

    //buttons on right when in sites and docs view
    this.previewElement = this.toolButtons.get(0);
    this.editElement = this.toolButtons.get(1);
    this.reorderViews = this.toolButtons.get(2);
    this.snapshots = this.toolButtons.get(3);
    this.sitesAndDocsSaveAll = this.toolButtons.get(4);

    this.save = this.toolButtons.get(2);
    this.cancel = this.toolButtons.get(4);



    //buttons in the center when in workspace view
    this.enableEdits = this.centerButtons.get(0);
    this.showComments = this.centerButtons.get(1);
    this.showElements = this.centerButtons.get(2);
    this.previousView = this.centerButtons.get(3);
    this.nextView = this.centerButtons.get(4);

    //Buttons that pop up when printing Document
    this.printButton = $('div.modal-footer').$('button.btn-primary');

    this.treeItems = element(by.tagName('mms-tree')).all(by.tagName('li'));    

    //allows for input into the filter input tab that opens pops up when the filter button is clicked
    this.filterInput = $('input.input-filter-tree');

    this.mainPane = element(by.tagName('mms-view'));
    this.mainPaneTitle = this.mainPane.element(by.tagName('mms-transclude-name')).element(by.tagName('span'));
    this.mainPaneTitleInput = this.mainPane.element(by.tagName('mms-transclude-name')).element(by.tagName('input'));
    
    this.mainPaneText = this.mainPane.element(by.tagName('mms-transclude-doc')).element(by.tagName('p'));
    this.mainPaneTable = this.mainPane.element(by.tagName('mms-transclude-doc')).element(by.tagName('table'));
    this.mainPaneEditText = this.mainPane.element(by.tagName('mms-transclude-doc')).element(by.tagName('iframe'));
    this.mainPaneTextButtons = element(by.tagName('mms-transclude-doc')).all(by.tagName('i'));
    this.tableButton = this.mainPaneTextButtons.get(33);
    this.insertTable = $('div.mce-caret');
    this.deleteTable = $('span#mceu_112-text');
    this.fourByFourTable = $('a#mcegrid33');
    this.mainPaneTextSave = element(by.tagName('button-bar-component')).$('view-tools');
    this.tableCells = element(by.tagName('tbody')).all(by.tagName('td')); 


    this.sitesAndDocsLink = $('.docweb-link');
    this.sitesLinkToADoc = this.mainPane.all(by.tagName('mms-view-link'));
    this.manualLink = element(by.tagName('mms-view-link')).element(by.tagName('a'));


    //gets the ems-int master browser (use for testing!)
    this.get = function() {
        browser.get('https://url/alfresco/mmsapp/mms.html#/workspaces/master');
    };

    //get Tommy's site
    this.getTommysSite = function() {

 browser.get('https:/url/alfresco/mmsapp/mms.html#/workspaces/master/sites/protractortesting/documents/MMS_1452545245762_f7bb0f37-f129-4add-a42b-285fbbdca73f/views/MMS_1452545255717_9f86acdf-4406-4d8b-a4a2-527240a5f1c2');
    }


    this.element = element(by.tagName('pre'));
    this.newElement = element(by.tagName('pre'));
};


describe('Testing Tommys stuff', function() {

        it('should edit view title', function() {

            var mms = new MMSApp();
            mms.getTommysSite();
            
            mms.fullDocument.click();
            browser.waitForAngular();
            mms.enableEdits.click();
            mms.printButton.click();
            browser.waitForAngular();
                  
 //           browser.WebDriver.getAllWindowHandles();
            browsr.sleep(4000)
            expect(mms.mainPaneTitle.getText()).toEqual('More Different Text');
          });

         it('Print Menu Click', function() {
            console.log("Print Now")
            

            browser.sleep(30000);
            var mms = new MMSApp();

            expect(mms.mainPaneTitle.getText()).toEqual('More Different Text');
        
          });
        
});
