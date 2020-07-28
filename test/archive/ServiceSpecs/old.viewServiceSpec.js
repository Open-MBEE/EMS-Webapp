'use strict';

// ViewService - done, 18 methods, [5 ElemeServ, 4 empty, 9 tested], expect 3 to fail
describe('ViewService', function() {
	beforeEach(module('mms'));

	var root = '/alfresco/service';
	var forceFail;
	var ViewService, $httpBackend, $rootScope;

	beforeEach(inject(function($injector) {
		ViewService = $injector.get('ViewService');
		$httpBackend = $injector.get('$httpBackend');
		$rootScope = $injector.get('$rootScope');

		$httpBackend.whenGET('/alfresco/service/workspaces/master/views/12345/elements?timestamp=01-01-2014').respond(
			{elements: [{author:'muschek', name:'view\'s element', sysmlid:12346, owner:12345, lastModified:'01-01-2014'}, 
			{author:'muschek', name:'view\'s 2nd element', sysmlid:12347, owner:12345, lastModified:'01-01-2014'}]});
		$httpBackend.whenGET('/alfresco/service/workspaces/master/views/12345/elements').respond({elements:[
			{author:'muschek', name:'view\'s element', sysmlid:12346, owner:12345, lastModified:'07-28-2014'},
			{author:'muschek', name:'view\'s 2nd element', sysmlid:12347, owner:12345, lastModified:'07-28-2014'}]});
	
		$httpBackend.whenGET(root + '/workspaces/master/sites/siteId/products/54321/views?timestamp=01-01-2014').respond(
			{elements:[{author:'muschek', name:'doc view', owner:54321, sysmlid:54322, lastModified:'01-01-2014'}]});
		$httpBackend.whenGET(root + '/workspaces/master/sites/siteId/products/65432/views').respond(
			{elements: [{author:'muschek', name:'other id view', owner:65432, sysmlid:65433, lastModified:'07-28-2014'}]});

		$httpBackend.whenGET(root + '/workspaces/master/elements/badId').respond(function(method, url) {
			var warning = '[ERROR]: Element with id, badId not found\n[WARNING]: No elements found';
			return [404, warning];
		});
		$httpBackend.whenGET(root + '/workspaces/master/elements/noSpecDocId').respond(
			{elements: [{author:'muschek', name:'doc with no spec', sysmlid:'noSpecDocId'}]});
		$httpBackend.whenGET(root + '/workspaces/master/elements/emptyView2ViewDocId').respond(
			{elements: [{author:'muschek', name:'doc with empty view2view', sysmlid:'emptyView2ViewDocId',
			specialization: {type:'Product', view2view:[], noSections:[]}
			}]});
		$httpBackend.whenGET(root + '/workspaces/master/elements/noIdMatchDocId').respond(
			{elements: [{author:'muschek', name:'do with non-empty view2view but no id match',
			sysmlid:'noIdMatchDocId', specialization:{type:'Product', 
			view2view:[{id:'notMatchingId', childrenViews:[]}]}}]});
		$httpBackend.whenGET(root + '/workspaces/master/elements/idMatchDocId').respond(
			{elements: [{name:'doc with matching id', sysmlid:'idMatchDocId', specialization:{type:'Product',
			view2view:[{id:'nonMatchId', childrenViews:[]}, {id:'parentViewId', childrenViews:[]}]}}]});

		$httpBackend.when('POST', root + '/workspaces/master/elements').respond(function(method, url, data) {

			var json = JSON.parse(data);

			if (!json.elements[0].sysmlid) {
				json.elements[0].sysmlid = json.elements[0].name + 'Id';
			}

			return [200, json];
		});

		$httpBackend.whenGET(root + '/workspaces/master/sites/ems/products').respond(function(method, url, data) {
			if (forceFail) { return [500, 'Internal Server Error']; }
			else {
				var products = { products: [ { id: 'productId', name: 'Product Name', snapshots: [ { created: '01-01-2014', creator: 'muschek',
				id: 'snapshotId' } ] } ] };
				return [200, products];
			}
		});
	}));

	it('can get an instance of the ViewService and methods are valid', inject(function() {
		expect(ViewService).toBeDefined();

		expect(ViewService.getView).not.toBe(null);
		expect(ViewService.getViews).not.toBe(null);
		expect(ViewService.getDocument).not.toBe(null);
		expect(ViewService.updateView).not.toBe(null);
		expect(ViewService.updateDocument).not.toBe(null);
		expect(ViewService.getViewElements).not.toBe(null);
		expect(ViewService.getViewComments).not.toBe(null);
		expect(ViewService.addViewComment).not.toBe(null);
		expect(ViewService.deleteViewComment).not.toBe(null);
		expect(ViewService.updateViewElements).not.toBe(null);
		expect(ViewService.createView).not.toBe(null);
		expect(ViewService.addViewToDocument).not.toBe(null);
		expect(ViewService.getSiteDocuments).not.toBe(null);
		expect(ViewService.setCurrentViewId).not.toBe(null);
		expect(ViewService.setCurrentDocumentId).not.toBe(null);
		expect(ViewService.getCurrentViewId).not.toBe(null);
		expect(ViewService.getCurrentDocumentId).not.toBe(null);
	}));

	// done, just calls ElementService
	it('getView', inject(function() {
	}));

	// done, just calls ElementService
	it('getViews', inject(function() {
	}));

	// done, just calls ElementService
	it('getDocument', inject(function() {
	}));

	// done, just calls ElementService
	it('updateView', inject(function() {
	}));

	// done, just calls ElementService
	it('updateDocument', inject(function() {
	}));

	// !-- NOTE: uses old web services API --!
	// !-- NOTE: also loses track of version when retrieving from server --!
	// done, expected to fail
	it('getViewElements', inject(function() {
		// (!viewElements.hasOwnProperty(ver) && * && *), fail
		ViewService.getViewElements('badId', false, 'master', '01-01-2014').then(function(response) {
			console.log('This should not be displayed');
		}, function(failMes) {
			expect(failMes.status).toEqual(200);
		});
		
		// (!viewElements.hasOwnProperty(ver) && * && *), success, !viewElements.hasOwnProperty(ver)
		ViewService.getViewElements('12345', false, 'master', '01-01-2014').then(function(response) {
			expect(response.length).toEqual(2);
			expect(response[0]).toEqual({author:'muschek', name:'view\'s element', sysmlid:12346, owner:12345, lastModified:'01-01-2014'});
			expect(response[1]).toEqual({author:'muschek', name:'view\'s 2nd element', sysmlid:12347, owner:12345, lastModified:'01-01-2014'});
		}); $httpBackend.flush();
		// viewElements['01-01-2014']['12345'] now exists

		// (viewElements.hasOwnProperty(ver) && !viewElements[ver].hasOwnProperty(id) && *), success, 
		// viewElements.hasOwnProperty(ver)
		ViewService.getViewElements('12345', false, 'master', 'latest').then(function(response) {
			expect(response.length).toEqual(2);
			expect(response[0]).toEqual({author:'muschek', name:'view\'s element', sysmlid:12346, owner:12345, lastModified:'07-28-2014'});
			expect(response[1]).toEqual({author:'muschek', name:'view\'s 2nd element', sysmlid:12347, owner:12345, lastModified:'07-28-2014'});
		}); $httpBackend.flush();
		// viewElements['latest']['12345'] now exists

		// (viewElements.hasOwnProperty(ver) && viewElements[ver].hasOwnProperty(id) && !update)
		ViewService.getViewElements('12345', false, 'master', '01-01-2014').then(function(response) {
			expect(response.length).toEqual(2);
			expect(response[0]).toEqual({author:'muschek', name:'view\'s element', sysmlid:12346, owner:12345, lastModified:'01-01-2014'});
			expect(response[1]).toEqual({author:'muschek', name:'view\'s 2nd element', sysmlid:12347, owner:12345, lastModified:'01-01-2014'});
		}); $rootScope.$apply();

		// (viewElements.hasOwnProperty(ver) && viewElements[ver].hasOwnProperty(id) && update),
		// success, viewElements.hasOwnProperty(ver)
		ViewService.getViewElements('12345', true, 'master', 'latest').then(function(response) {
			expect(response.length).toEqual(2);
			expect(response[0]).toEqual({author:'muschek', name:'view\'s element', sysmlid:12346, owner:12345, lastModified:'07-28-2014'});
			expect(response[1]).toEqual({author:'muschek', name:'view\'s 2nd element', sysmlid:12347, owner:12345, lastModified:'07-28-2014'});
		});
	}));

	// done, empty
	it('getViewComments', inject(function() {}));

	// done, empty
	it('addViewComment', inject(function() {}));

	// done, empty
	it('deleteViewComment', inject(function() {}));

	// done, empty
	it('updateViewElements', inject(function() {}));

	// done
	it('addViewToDocument', inject(function() {
		// fail
		ViewService.addViewToDocument('viewId', 'badId', 'parentViewId', 'master').then(function(response) {
			console.log('This should not be displayed');
		}, function(failMes) {
			expect(failMes.status).toEqual(404);
			expect(failMes.data).toEqual('[ERROR]: Element with id, badId not found\n[WARNING]: No elements found');
		}); $httpBackend.flush();

		// success, data.specialization.view2view.length == 0, fail

		// success, data has no specialization
		expect(function() {
			ViewService.addViewToDocument('viewId', 'noSpecDocId', 'parentViewId', 'master');
			$httpBackend.flush();
		}).toThrow(new Error('data.specialization is undefined'));

		// success, data.specialization.view2view.length == 0, success
		ViewService.addViewToDocument('viewId', 'emptyView2ViewDocId', 'parentViewId', 'master')
		.then(function(response) {
			expect(response.sysmlid).toEqual('emptyView2ViewDocId');
			expect(response.specialization.view2view.length).not.toEqual(0);
			expect(response.specialization.view2view[0]).toEqual({id: 'viewId', childrenViews:[]});
		}); $httpBackend.flush();

		// success, data.specialization.view2view.length > 0, fail

		// success, data.specialization.view2view.length > 0, no id match, success
		ViewService.addViewToDocument('viewId', 'noIdMatchDocId', 'parentViewId', 'master')
		.then(function(response) {
			expect(response.sysmlid).toEqual('noIdMatchDocId');
			expect(response.specialization.view2view.length).toEqual(2);
			expect(response.specialization.view2view[0]).toEqual({id:'notMatchingId', childrenViews:[]});
			expect(response.specialization.view2view[1]).toEqual({id: 'viewId', childrenViews:[]});
		}); $httpBackend.flush();

		// success, data.specialization.view2vivew.length > 0, id match, success
		ViewService.addViewToDocument('viewId', 'idMatchDocId', 'parentViewId', 'master')
		.then(function(response) {
			expect(response.sysmlid).toEqual('idMatchDocId');
			expect(response.specialization.view2view.length).toEqual(3);
			expect(response.specialization.view2view[0]).toEqual({id: 'nonMatchId', childrenViews:[]});
			expect(response.specialization.view2view[1]).toEqual({id: 'parentViewId', childrenViews:['viewId']});
			expect(response.specialization.view2view[2]).toEqual({id: 'viewId', childrenViews:[]});
		}); $httpBackend.flush();
	}));

	// !-- NOTE: due to how ElementService.updateElement works the new view's owner property will be deleted --!
	// Test cases assume that ElementService's method both pass correctly
	// done - expect this to fail
	it('createView', inject(function() {

		// createElement - pass, updateElement - pass, !documentId
		ViewService.createView('ownerId', undefined, undefined, 'master').then(function(response) {
			expect(response.owner).toEqual('ownerId');
			expect(response.name).toEqual('Untitled View');
			expect(response.documentation).toEqual('');
			expect(response.specialization.type).toEqual('View');
			expect(response.specialization.contains).toEqual([{type:'Paragraph', sourceType:'reference',
				source: response.sysmlid, sourceProperty:'documentation'}]);
			expect(response.specialization.allowedElements).toEqual([response.sysmlid]);
			expect(response.specialization.displayedElements).toEqual([response.sysmlid]);
			expect(response.specialization.childrenViews).toEqual([]);
		}); $httpBackend.flush();

		// createElement - pass, updateElement - pass, documentId, addViewToDoc - fail

		// createElement - pass, updateElement - pass, documentId, addViewToDoc - pass
		ViewService.createView('ownerId', 'name', 'idMatchDocId', 'master').then(function(response) {
			expect(response.owner).toEqual('ownerId');
			expect(response.name).toEqual('name');
			expect(response.documentation).toEqual('');
			expect(response.specialization.type).toEqual('View');
			expect(response.specialization.contains).toEqual([{type:'Paragraph', sourceType:'reference',
				source: response.sysmlid, sourceProperty:'documentation'}]);
			expect(response.specialization.allowedElements).toEqual([response.sysmlid]);
			expect(response.specialization.displayedElements).toEqual([response.sysmlid]);
			expect(response.specialization.childrenViews).toEqual([]);
		}); $httpBackend.flush();

	}));

	// done
	it('getSiteDocuments', inject(function() {

		// !(siteDocuments.hasOwnProperty(site) && !update), getGenericElements - fail
		forceFail = true;
		ViewService.getSiteDocuments('ems', undefined, undefined).then(function(response) { displayError(); },
			function(failMessage) {
				expect(failMessage.status).toEqual(500);
				expect(failMessage.data).toEqual('Internal Server Error');
			});
		$httpBackend.flush();
		forceFail = false;

		// !(siteDocuments.hasOwnProperty(site) && !update), getGenericElements - pass
		ViewService.getSiteDocuments('ems', undefined, undefined).then(function(response) {
			expect(response.length).toEqual(1);

			expect(response[0].id).toEqual('productId');
			expect(response[0].name).toEqual('Product Name');

			expect(response[0].snapshots.length).toEqual(1);
			expect(response[0].snapshots[0]).toEqual( { created: '01-01-2014', creator: 'muschek', id: 'snapshotId' } );
		}); $httpBackend.flush();

		// (siteDocuments.hasOwnProperty(site) && !update)
		ViewService.getSiteDocuments('ems', false, undefined).then(function(response) {
			expect(response.length).toEqual(1);

			expect(response[0].id).toEqual('productId');
			expect(response[0].name).toEqual('Product Name');

			expect(response[0].snapshots.length).toEqual(1);
			expect(response[0].snapshots[0]).toEqual( { created: '01-01-2014', creator: 'muschek', id: 'snapshotId' } );
		}); $rootScope.$apply();
	}));

	// done
	it('getCurrentViewId', inject(function() {
		expect(ViewService.getCurrentViewId()).toBe('');

		ViewService.setCurrentViewId('newViewId');
		expect(ViewService.getCurrentViewId()).toBe('newViewId');
	}));

	// done
	it('setCurrentViewId', inject(function() {
		ViewService.setCurrentViewId('newViewId');
		expect(ViewService.getCurrentViewId()).toBe('newViewId');
	}));

	// done
	it('getCurrentDocumentId', inject(function() {
		expect(ViewService.getCurrentDocumentId()).toBe('');

		ViewService.setCurrentDocumentId('newDocumentId');
		expect(ViewService.getCurrentDocumentId()).toBe('newDocumentId');
	}));

	// done
	it('setCurrentDocumentId', inject(function() {
		ViewService.setCurrentDocumentId('newDocumentId');
		expect(ViewService.getCurrentDocumentId()).toBe('newDocumentId');
	}));
});