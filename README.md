### pkgcloud-sync

A cloud storage syncing library. Allows you to synchronize a container from one cloud to another.

Currently supported storage providers are:

- Amazon AWS Simple Storage Service (s3) `amazon`
- HP Cloud `hp`
- Openstack Swift `openstack`
- Rackspace Cloud Files `rackspace`

### Basic Usage

```javascript
var Sync = require('pkgcloud-sync').Sync;

var sync = new Sync({
  source: {
    provider: 'rackspace',
    region: 'dfw',
    username: '<rackspace-username>',
    apiKey: '<rackspace-apiKey>'
  },
  destination: {
    provider: 'rackspace',
    region: 'dfw',
    username: '<rackspace-username>',
    apiKey: '<rackspace-apiKey>'
  },
  containers: 'my-container'
});

sync.run(function(err) {
	if (err) {
		log.error(err);
	}
	process.exit(err ? 1 : 0);
});
```

This will sync all of the contents of container `my-container` from the `DFW` region to the `IAD` region for Rackspace. Subsequent executions of the sync will validate contents before uploading, thus saving significant time.

** It is strongly encouraged to run this from either the source or destination region. **

The following providers are unsupported at this time:

- Google Cloud Storage `google`

The Google Cloud Storage provider is somewhat functional, but is not yet fully tested. See [pkgcloud#399](https://github.com/pkgcloud/pkgcloud/issues/399) for more information.


