'use strict';

// !-- NOTE: need to test handleHttpStatus --!
// URLService - done, 16 methods, [16 normal], expect 3 to fail
describe('URLService', function() {
	beforeEach(module('mms'));

	var URLService, $rootScope, $q;
	var expectedReturn;

	beforeEach(inject(function($injector) {
		URLService = $injector.get('URLService');
		$rootScope = $injector.get('$rootScope');
		$q = $injector.get('$q');

		expectedReturn = '';
	}));

	var root = '/alfresco/service';

	it('can get an instance of URLService', inject(function() {
		//URLService function exists
		expect(URLService).toBeDefined();

		//URLService returns object that has all these attributes
		expect(URLService.getSiteDashboardURL).toBeDefined();
		expect(URLService.getElementURL).toBeDefined();
		expect(URLService.getElementVersionsURL).toBeDefined();
		expect(URLService.getPostElementsURL).toBeDefined();
		expect(URLService.handleHttpStatus).toBeDefined();
		expect(URLService.getSitesURL).toBeDefined();
		expect(URLService.getElementSearchURL).toBeDefined();
		expect(URLService.getImageURL).toBeDefined();
		expect(URLService.getProductSnapshotsURL).toBeDefined();
		expect(URLService.getConfigSnapshotsURL).toBeDefined();
		expect(URLService.getSiteProductsURL).toBeDefined();
		expect(URLService.getConfigURL).toBeDefined();
		expect(URLService.getSiteConfigsURL).toBeDefined();
		expect(URLService.getConfigProductsURL).toBeDefined();
		expect(URLService.getViewElementsURL).toBeDefined();
	}));

	it('getConfigSnapshotsURL', inject(function() {

		expectedReturn = root + '/workspaces/master/sites/ems/configurations/configId/snapshots';
		expect(URLService.getConfigSnapshotsURL('configId', 'ems', 'master')).toEqual(expectedReturn);
	}));

	it('getProductSnapshotsURL', inject(function() {
		expectedReturn = root + '/workspaces/master/sites/ems/products/productId/snapshots';
		expect(URLService.getProductSnapshotsURL('productId', 'ems', 'master')).toEqual(expectedReturn)
	}));

	it('getSiteConfigsURL', inject(function() {
		expectedReturn = root + '/workspaces/master/sites/ems/configurations';
		expect(URLService.getSiteConfigsURL('ems', 'master')).toEqual(expectedReturn);
	}));

	it('getConfigProductsURL', inject(function() {
		expectedReturn = root + '/workspaces/master/sites/ems/configurations/configId/products';
		expect(URLService.getConfigProductsURL('configId', 'ems', 'master')).toEqual(expectedReturn);
	}));

	it('getConfigURL', inject(function() {
		expectedReturn = root + '/workspaces/master/sites/ems/configurations/configId';
		expect(URLService.getConfigURL('configId', 'ems', 'master')).toEqual(expectedReturn);
	}));

	it('getSiteProductsURL', inject(function() {
		expectedReturn = root + '/workspaces/master/sites/ems/products';
		expect(URLService.getSiteProductsURL('ems', 'master')).toEqual(expectedReturn);
	}));

	it('getImageURL', inject(function() {
		expectedReturn = root + '/workspaces/master/artifacts/artifactId';

		// latest
		expect(URLService.getImageURL('artifactId', 'master', 'latest')).toEqual(expectedReturn);

		// timestamp
		expectedReturn += '?timestamp=01-01-2014';
		expect(URLService.getImageURL('artifactId', 'master', '01-01-2014')).toEqual(expectedReturn);
		
		// version
		expectedReturn = root + '/workspaces/master/artifacts/artifactId/versions/versionId';
		expect(URLService.getImageURL('artifactId', 'master', 'versionId')).toEqual(expectedReturn);
	}));

	it('getSiteDashboardURL', inject(function() {
		expectedReturn = '/share/page/site/ems/dashboard';
		expect(URLService.getSiteDashboardURL('ems')).toBe(expectedReturn);
	}));

	it('getElementURL', inject(function() {

		expectedReturn = root + '/workspaces/master/elements/elementId';
		
		// latest
		expect(URLService.getElementURL('elementId', 'master', 'latest')).toBe(expectedReturn);

		// timestamp
		expectedReturn += '?timestamp=01-01-2014';
		expect(URLService.getElementURL('elementId', 'master', '01-01-2014')).toBe(expectedReturn);

		// version
		expectedReturn = root + '/workspaces/master/elements/elementId/versions/versionId';
		expect(URLService.getElementURL('elementId', 'master', 'versionId')).toBe(expectedReturn);
	}));

	// !-- NOTE: this function uses old API web services --!
	// !-- NOTE: his function takes versionId as a parameter, however,
	// the urls it is calling on do not exist --!
	it('getViewElementsURL', inject(function() {
		expectedReturn = root + '/workspaces/master/views/viewId/elements';

		// latest
		expect(URLService.getViewElementsURL('viewId', 'master', 'latest')).toEqual(expectedReturn);

		// timestamp
		expectedReturn += '?timestamp=01-01-2014';
		expect(URLService.getViewElementsURL('viewId', 'master', '01-01-2014')).toEqual(expectedReturn);

		// version
		expectedReturn = root + '/workspaces/master/views/viewId/versions/versionId';
		expect(URLService.getViewElementsURL('viewId', 'master', 'versionId')).toEqual(expectedReturn);
	}));

	// !-- NOTE: this function uses old API web services --!
	it('getElementVersionsURL', inject(function() {
		expectedReturn = root + '/workspaces/master/elements/elementId/versions';

		expect(URLService.getElementVersionsURL('elementId', 'master')).toEqual(expectedReturn);
	}));

	it('getPostElementsURL', inject(function() {
		var expectedReturn = root + '/workspaces/master/elements';
		expect(URLService.getPostElementsURL('master')).toEqual(expectedReturn);
	}));

	it('handleHttpStatus', inject(function() {

		// 404
		var deferred = $q.defer();
		URLService.handleHttpStatus( {}, 404, undefined, undefined, deferred );
		deferred.promise.then(function(response) { displayError(); }, 
			function(failMessage) {
				expect(failMessage.status).toEqual(404);
				expect(failMessage.data).toEqual( {} );
				expect(failMessage.message).toEqual('Not Found');
			});
		$rootScope.$apply();

		// 500
		deferred = $q.defer();
		URLService.handleHttpStatus( {}, 500, undefined, undefined, deferred );
		deferred.promise.then(function(response) { displayError(); }, 
			function(failMessage) {
				expect(failMessage.status).toEqual(500);
				expect(failMessage.data).toEqual( {} );
				expect(failMessage.message).toEqual('Server Error');
			});
		$rootScope.$apply();

		// 401 || 403
		deferred = $q.defer();
		URLService.handleHttpStatus( {}, 401, undefined, undefined, deferred );
		deferred.promise.then(function(response) { displayError(); }, 
			function(failMessage) {
				expect(failMessage.status).toEqual(401);
				expect(failMessage.data).toEqual( {} );
				expect(failMessage.message).toEqual('Permission Error');
			});
		$rootScope.$apply();

		deferred = $q.defer();
		URLService.handleHttpStatus( {}, 403, undefined, undefined, deferred );
		deferred.promise.then(function(response) { displayError(); }, 
			function(failMessage) {
				expect(failMessage.status).toEqual(403);
				expect(failMessage.data).toEqual( {} );
				expect(failMessage.message).toEqual('Permission Error');
			});
		$rootScope.$apply();

		// 409
		deferred = $q.defer();
		URLService.handleHttpStatus( {}, 409, undefined, undefined, deferred );
		deferred.promise.then(function(response) { displayError(); }, 
			function(failMessage) {
				expect(failMessage.status).toEqual(409);
				expect(failMessage.data).toEqual( {} );
				expect(failMessage.message).toEqual('Conflict');
			});
		$rootScope.$apply();

		// else
		deferred = $q.defer();
		URLService.handleHttpStatus( {}, 600, undefined, undefined, deferred );
		deferred.promise.then(function(response) { displayError(); }, 
			function(failMessage) {
				expect(failMessage.status).toEqual(600);
				expect(failMessage.data).toEqual( {} );
				expect(failMessage.message).toEqual('Failed');
			});
		$rootScope.$apply();

		deferred = $q.defer();
		URLService.handleHttpStatus( {}, 'string', undefined, undefined, deferred );
		deferred.promise.then(function(response) { displayError(); }, 
			function(failMessage) {
				expect(failMessage.status).toEqual('string');
				expect(failMessage.data).toEqual( {} );
				expect(failMessage.message).toEqual('Failed');
			});
		$rootScope.$apply();
	}));

	it('getSitesURL', inject(function() {
		var expectedReturn = root + '/rest/sites';
		expect(URLService.getSitesURL()).toEqual(expectedReturn);
	}));

	// !-- NOTE: this function uses old API web services --!
	// !-- NOTE: this function may be removed --!
	it('getElementSearchURL', inject(function() {
		var query = 'queryKeyword';
		expectedReturn = root + '/javawebscripts/element/search?keyword=muschek';
		expect(URLService.getElementSearchURL('muschek', 'master')).toBe(expectedReturn);
	}));
	
	// Private methods: isTimestamp, addVersion, handleHttpStatus
	// Not tested
});