Package.describe({
	name: 'freelancecourtyard:reactivecomponent',
	version: '0.0.1',
	// Brief, one-line summary of the package.
	summary: 'helper to wrap React component to be reactive',
	// URL to the Git repository containing the source code for this package.
	git: '',
	// By default, Meteor will default to using README.md for documentation.
	// To avoid submitting documentation, set this field to null.
	documentation: 'README.md'
});

Npm.depends({
	'react-komposer': '2.0.0',
});

Package.onUse(function setupPackage(api) {
	api.versionsFrom('1.4.2.3');
	api.use('ecmascript');
	api.mainModule('reactivecomponent.js');
});
