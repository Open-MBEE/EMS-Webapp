'use strict';

xdescribe('Service: ViewService', function() {
	beforeEach(module('mms'));

	var root = '/alfresco/service/projects/heyaproject/refs/master';

	var ViewServiceObj;
	var mockCacheService, mockURLService, mockElementService, mockUtilsService;
	var $httpBackend;
	var $rootScope;
	var ownerId;
	var TYPE_TO_CLASSIFIER_ID;
	var elemOb;

	beforeEach(inject(function($injector) {
		ViewServiceObj 		= $injector.get('ViewService');
		mockCacheService 	= $injector.get('CacheService');
		mockURLService		= $injector.get('URLService');
		mockElementService	= $injector.get('ElementService');
		mockUtilsService	= $injector.get('UtilsService');
		$httpBackend		= $injector.get('$httpBackend');
		$rootScope			= $injector.get('$rootScope');

		TYPE_TO_CLASSIFIER_ID = {
			Image: "_17_0_5_1_407019f_1430628206190_469511_11978",
			List: "_17_0_5_1_407019f_1430628190151_363897_11927",
			Paragraph: "_17_0_5_1_407019f_1430628197332_560980_11953",
			Table: "_17_0_5_1_407019f_1430628178633_708586_11903",
			Section: "_17_0_5_1_407019f_1430628211976_255218_12002",
			ListT: "_17_0_5_1_407019f_1431903739087_549326_12013",
			TableT: "_17_0_5_1_407019f_1431903724067_825986_11992",
			Figure: "_17_0_5_1_407019f_1431903748021_2367_12034",  //manual images + timely, etc
			Equation: "_17_0_5_1_407019f_1431905053808_352752_11992",
			ParagraphT: "_17_0_5_1_407019f_1431903758416_800749_12055",
			SectionT: "_18_0_2_407019f_1435683487667_494971_14412"
		};

		elemOb = {
			_modifier					: "admin",
			powertypeExtentIds			: [],
			representationId			: null,
			mdExtensionsIds				: [],
			templateBindingIds			: [],
			appliedStereotypeInstanceId	: "applid",
			templateParameterId			: null,
			isActive					: false,
			ownerId 					: "ownerid",
			type 						: "Class",
			isLeaf 						: false,
			clientDependencyIds 		: [],
			_displayedElements 			: ["diselements"],
			useCaseIds 					: [],
			syncElementId 				: null,
			classifierBehaviorId 		: null,
			interfaceRealizationIds 	: [],
			id 							: "heyanelement",
			_elasticId 					: "elasticid",
			_refId 						: "master",
			supplierDependencyIds 		: [],
			_modified 					: "2017-05-03T10:51:50.270-0700",
			_appliedStereotypeIds 		: ["stereotypeids"],
			nameExpression 				: null,
			ownedAttributeIds 			: ["ownedattr1","ownedattr2","ownedattr3","ownedattr4","ownedattr5"],
			packageImportIds 			: [],
			visibility 					: null,
			substitutionIds 			: [],
			documentation 				: "",
			redefinedClassifierIds 		: [],
			_editable 					: true,
			isAbstract 					: false,
			_contents:
				{
					type: "Expression",
					operand: [
						{
							instanceId: "instanceid",
							type: "InstanceValue"
						}
					]
				},
			_commitId 					: "latest",
			_childViews: [
				{
					aggregation: "composite",
					id: "heyanelement"
				},
				{
					aggregation: "composite",
					id: "child2"
				},
				{
					aggregation: "composite",
					id: "child3"
				},
				{
					aggregation: "composite",
					id: "child4"
				},
				{
					aggregation: "composite",
					id: "child5"
				}
			],
			generalizationIds 			: [],
			_creator 					: "admin",
			ownedOperationIds 			: [],
			_created 					: "2017-05-01T13:43:19.571-0700",
			name 						: "Krabby Patties",
			elementImportIds 			: [],
			collaborationUseIds 		: [],
			isFinalSpecialization 		: false,
			_projectId 					: "heyaproject"
		}
	}));

	afterEach(function () {
		$httpBackend.verifyNoOutstandingExpectation();
 		$httpBackend.verifyNoOutstandingRequest();
	});

	describe('Method: downgradeDocument', function() {
		it('it should demote an object to a view', function() {
			var result;
			var newElemOb = elemOb;
			newElemOb._appliedStereotypeIds = ['_11_5EAPbeta_be00301_1147420760998_43940_227'];
			$httpBackend.when('POST', root + '/elements/heyanelement', newElemOb).respond(
				function(method, url, data) {
					return [201, ''];
				});
 			ViewServiceObj.downgradeDocument(elemOb).then(function(data) {
 				result = data;
 			}, function(reason) {
 				result = reason.message;
 			});
 			expect(result).toEqual(newElemOb);
		});
	});

	describe('Method: getViewElements', function() {
		it('it should get the element objects for elements allowed in the view', function() {
			var result;
			var testElem = {
				projectId: "heyaproject",
				elementId: "heyanelement",
				refId: 'master',
				commitId: 'latest'
			};
			$httpBackend.when('GET', root + '/elements/heyanelement').respond(
				function(method, url, data) {
					return [200, testElem];
				});
			ViewServiceObj.getViewElements(testElem).then(function(data) {
				result = data;
			}, function(reason) {
				result = reason.message;
			});
			$httpBackend.flush();
			expect(result).toEqual(testElem);
		});
	});

	describe('Method: addViewtToParentView', function() {
		it('it should get the view objects for a document', function() {
			var result;
 			var testElem = {
				projectId: "heyaproject",
				elementId: "heyanelement",
				refId: 'master',
				commitId: 'latest'
			};
			$httpBackend.when('GET', root + '/elements/heyanelement').respond(testElem);
			ViewServiceObj.addViewToParentView(testElem).then(function(data) {
				result = data;
			}, function(reason) {
				result = reason.message;
			});
			expect(result).toEqual(testElem);
		});
	});

	describe('Method CreateView', function() {
		it('create a view similar to the workspace state in app.js', inject(function() {
			ViewService.createView(undefined, 'Untitled View', undefined, 'master', 'viewDoc').then(function(data) {
				//console.log(JSON.stringify(data));
				expect(data.name).toEqual('Untitled View');
				expect(data.documentation).toEqual('');
				expect(data.type).toEqual('Class');
			}, function(reason){
				console.log("this happened" + reason);
			}); 
			$httpBackend.flush();
		}));
		it('create a view similar to the workspace state in the tree controller', inject(function() {
			ViewService.createView(ownerId, 'create view for tree', 'idMatchDocId', 'master').then(function(data){
				expect(data.ownerId).toEqual('MMS_1442345799882_df10c451-ab83-4b99-8e40-0a8e04b38b9d');
			},
			function(reason){
				console.log("this happened" + reason);
			});
			$httpBackend.flush();
		}));
	});
	xdescribe('Method createDocument', function() {
		it('create a document similar to the tree Controller', inject(function() {
			ViewService.createDocument('newDocument','siteId' ,'master').then(function(data){
				//console.log("The long object " + JSON.stringify(data, null, " "));
				expect(data.name).toEqual('newDocument');
				expect(data._view2view).toBeUndefined();
				expect(data._contents.operand).toBeDefined();
			},
			function(reason){
				console.log("this happened" + reason);
			});
			$httpBackend.flush();
		}));
		it('should create a document without passing a name', inject(function() {
			ViewService.createDocument(undefined,'siteId' ,'master').then(function(data){
				//console.log("The long object " + JSON.stringify(data, null, " "));
				expect(data.name).toEqual('Untitled View');
			},
			function(reason){
				console.log("this happened" + reason);
			});
			$httpBackend.flush();
		}));
	});
	xdescribe('Method createInstanceSpecification', function() {
		it('should update View object called like controller.utils without a name', inject(function() {
			ViewService.createInstanceSpecification(ownerId,'master', 'Paragraph').then(function(data){
				//console.log("The long object " + JSON.stringify(data, null, " "));
				expect(data.type).toEqual('InstanceSpecification');
				expect(data.name).toEqual('Untitled Paragraph');
			},
			function(reason){
				console.log("this happened" + reason);
			});
			$httpBackend.flush();
		}));
		it('should update view object without a site name, but with a name', inject(function() {
			ViewService.createInstanceSpecification(ownerId,'master', 'Paragraph', null, 'named').then(function(data){
				//console.log("The long object " + JSON.stringify(data, null, " "));
				expect(data.type).toEqual('InstanceSpecification');
				expect(data.name).toEqual('named');
			},
			function(reason){
				console.log("this happened" + reason);
			});
			$httpBackend.flush();
		}));
		it('should update view object with a site name and with a name', inject(function() {
			ViewService.createInstanceSpecification(ownerId,'master', 'Paragraph', 'siteId', 'named').then(function(data){
				//console.log("The long object " + JSON.stringify(data, null, " "));
				expect(data.type).toEqual('InstanceSpecification');
				expect(data.name).toEqual('named');
			},
			function(reason){
				console.log("this happened" + reason);
			});
			$httpBackend.flush();
		}));
	});
	xdescribe('Method getViewElements', function() {
		// getViewElements = function(id, update, workspace, version, weight, eidss) 
		it('should return the latest element in the cache', function() {
			var elem = {sysmlId:"elemId",type:"Class",name:"elemId",
					   documentation:"",_appliedStereotypeIds:["7929"]};
			CacheService.put('views|master|elemId|latest|elements', elem );
			//console.log(CacheService.get('views|master|elemId|latest|elements'));
			ViewService.getViewElements('elemId', false, 'master','latest').then(function(data) {
				//console.log("The long object " + JSON.stringify(data, null, " "));
				expect(data.sysmlId).toEqual('elemId');
			}, function(){
				console.log('fail');
			});
			$rootScope.$apply();
			//$httpBackend.flush();
		});
		it('should return promise from the inProgress queue', function() {
			//inProgress structure should be replaced
		});
		it('should return the element from the mock server', function() {
			// get generic elements logic, returns a list of elements when you call by the url alone---applys to products and such
			ViewService.getViewElements('elemId', false, 'master','latest').then(function(data) {
				console.log("The long object " + JSON.stringify(data, null, " "));
			}, function(){
				console.log('fail');
			});
			$rootScope.$apply();
			$httpBackend.flush();
		});
		it('should return the element from the generic element method', function() {
			// get generic elements logic, returns a list of elements when you call by the url alone---applys to products and such
			ViewService.getViewElements('elemId', false, 'master','latest').then(function(data) {
				console.log("The long object " + JSON.stringify(data, null, " "));
			}, function(){
				console.log('fail');
			});
			$rootScope.$apply();
			$httpBackend.flush();
		});
	});
});