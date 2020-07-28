//This does not need to be tested (6/4/17)
"use strict";

describe("URLService", function () {
	beforeEach(module('mms'));

	var mockApplicationService, URLServiceObj, $httpBackend, $rootScope, $http, $q, root;

	beforeEach(inject(function ($injector) {
		URLServiceObj   = $injector.get('URLService');
		$http        = $injector.get('$http');
		$httpBackend = $injector.get('$httpBackend');
		$rootScope   = $injector.get('$rootScope');
		$q           = $injector.get('$q');
		it('should get the root url', inject(function () {
			root = URLServiceObj.getRoot();
			expect(root).toBeDefined();
		}));

		$httpBackend.when('GET', root + '/mmsversion').respond(
			function (method, url, data) {
				return [200, {mmsVersion: "2.3.8"}];
			}
		);
	}));

	afterEach(function () {
		$httpBackend.verifyNoOutstandingRequest();
	});

	describe('Method getMmsVersionURL', function () {
		it('should return the root url with /mmsversion appended to the string', inject(function () {
			var mmsUrl = URLServiceObj.getMmsVersionURL();
			expect('/alfresco/service/mmsversion').toBe(mmsUrl.toString());
		}))
	});

	describe('Method getExportHtmlUrl', function () {
		var project = "this_isnt_your_project";
		var ref      = "dont_go_to_this_site";
		var htmlToPdfURL;
		it('should generate the correct url', inject(function () {
			htmlToPdfURL = root + "/projects/" + project + "/refs/" + ref + '/convert';
			expect(htmlToPdfURL).toBe(URLServiceObj.getExportHtmlUrl(project, ref));
		}));
	});

	describe('Method getCheckLoginURL', function () {
		it("should create the checklogin url used to check login for Alfresco", inject(function () {
			var checkLoginUrl = root + '/checklogin';
			expect(checkLoginUrl).toBe(URLServiceObj.getCheckLoginURL());
		}));
	});

	describe('Method getOrgsURL', function() {
		it("should create the url for organizations", function() {
			var orgsUrl = root + '/orgs';
			expect(orgsUrl).toBe(URLServiceObj.getOrgsURL());
		});
	});

	describe('Method getProjectsURL', function() {
		var orgId = 'hereisanorg';
		var projectId = 'hereisaproject';
		it("should create the url for projects", function() {
			var projectsUrl = root + '/orgs/' + orgId + '/projects';
			expect(projectsUrl).toBe(URLServiceObj.getProjectsURL(orgId));
		});
	});

	describe('Method getProjectURL', function() {
		var projectId = 'hereisaproject';
		it("should create the url for a project", function() {
			var projectUrl = root + '/projects/' + projectId;
			expect(projectUrl).toBe(URLServiceObj.getProjectURL(projectId));
		});
	});

	describe('Method getProjectMountsURL', function() {
		var projectId = 'hereisaproject';
		var refId = 'thisisaref';
		it("should create the url for the mounts of a project", function() {
			var projectMountsUrl = root + '/projects/' + projectId + '/refs/' + refId + '/mounts';
			expect(projectMountsUrl).toBe(URLServiceObj.getProjectMountsURL(projectId, refId));
		});
	});

	describe('Method getRefsURL', function() {
		var projectId = 'hereisaproject';
		it("should create the url for the refs of a project", function() {
			var refsUrl = root + '/projects/' + projectId + '/refs';
			expect(refsUrl).toBe(URLServiceObj.getRefsURL(projectId));
		});
	});

	describe('Method getRefURL', function() {
		var projectId = 'hereisaproject';
		var refId = 'thisisaref';
		it("should create the url for the refs of a project", function() {
			var refUrl = root + '/projects/' + projectId + '/refs/' + refId;
			expect(refUrl).toBe(URLServiceObj.getRefURL(projectId, refId));
		});
	});

	describe('Method getGroupsURL', function() {
		var projectId = 'hereisaproject';
		var refId = 'thisisaref';
		it("should create the url for the groups of a project", function() {
			var groupsUrl = root + '/projects/' + projectId + '/refs/' + refId + '/groups';
			expect(groupsUrl).toBe(URLServiceObj.getGroupsURL(projectId, refId));
		});
	});

	describe('Method getProjectDocumentsURL', function() {
		var reqOb = {
			projectId: "heyaproject",
			elementId: "heyanelement",
			refId: 'master',
			commitId: 'latest'
		};
		it("should create the url for the refs of a project", function() {
			var projectDocumentsUrl = root + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/documents';
			expect(projectDocumentsUrl).toBe(URLServiceObj.getProjectDocumentsURL(reqOb));
		});
	});

	describe('Method getImageURL', function() { //not sure what's happening with this
		var reqOb = {
			projectId: "heyaproject",
			elementId: "heyanelement",
			refId: 'master',
			commitId: 'latest',
			accept: true
		};
		it("should create the url for an image", function() {
			var imageUrl = root + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' + reqOb.elementId;
			expect(imageUrl).toEqual(URLServiceObj.getImageURL(reqOb));
		});
	});

	describe('Method getElementURL', function() { //not sure what's happening with this
		var reqOb = {
			projectId: "heyaproject",
			elementId: "heyanelement",
			refId: 'master',
			commitId: 'latest',
			accept: true
		};
		it("should create the url for an element", function() {
			var elementUrl = root + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' + reqOb.elementId;
			expect(elementUrl).toEqual(URLServiceObj.getElementURL(reqOb));
		});
	});

	describe('Method getElementHistoryURL', function () {
		var reqOb = {
			projectId: "heyaproject",
			elementId: "heyanelement",
			refId: 'master',
			commitId: 'latest',
			accept: true
		};
		it('should create the url to query for element history', function () {
			var elementHistoryUrl = root + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' + reqOb.elementId + '/commits';
			expect(elementHistoryUrl).toBe(URLServiceObj.getElementHistoryURL(reqOb));
		});
	});

	describe('Method getPostElementsURL', function () {
		var reqOb = {
			projectId: "heyaproject",
			elementId: "heyanelement",
			refId: 'master',
			commitId: 'latest',
			extended: true,
			returnChildViews: true
		};
		it('should create the url for posting element changes', function () {
			var postElementsUrlEx = root + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements?childviews=true&extended=' + reqOb.extended;
			expect(postElementsUrlEx).toBe(URLServiceObj.getPostElementsURL(reqOb));
		});
	});

	describe('Method getElementSearchURL', function () {
		var reqOb = {
			projectId: "heyaproject",
			elementId: "heyanelement",
			refId: 'master',
			commitId: 'latest',
			accept: true
		};
		it('should create the url to query for element keyword search', function () {
			var elementSearchUrl = root + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/search?checkType=true&extended=true';
			expect(elementSearchUrl).toBe(URLServiceObj.getElementSearchURL(reqOb));
		});
	});

});
