var async = require('async'),
	File = require('./file');

var Container = function(sync, name) {
	this.client = sync;
	this.sourceContainerName = name;
	this.destinationContainerName = this.sourceContainerName + this.client.options.containerSuffix;
	this.containers = {};
	this.totalBytes = 0;
	this.filesProcessed = 0;
	this.filesSkipped = 0;
	this.started = false;
};

Container.prototype.sync = function(callback) {
	var self = this;

	if (self.started) {
		callback(new Error('Sync must not already be started'));
		return;
	}

	self.started = true;
	self.client.emit('log::info', 'Starting Sync for Container: ' + self.sourceContainerName);

	function getSource(next) {
		self.client.source.getContainer(self.sourceContainerName, function(err, container) {
			if (err) {
				next(err);
				return;
			}

			self.containers.source = container;
			next();
		});
	}

	function getDest(next) {
		self.client.destination.getContainer(self.destinationContainerName, function(err, container) {
			// only return err if it's a non-404 error
			if (err && (err.statusCode !== 404 && err.code !== 404)) {
				next(err);
				return;
			}

			self.containers.destination = container;
			next();
		});
	}

	async.parallel([ getSource, getDest ], function(err) {
		// did something go wrong?
		if (err) {
			callback(err);
			return;
		}

		// did we find a destination container? if not let's create it
		if (!self.containers.destination) {
			self.client.destination.createContainer(self.destinationContainerName, function(err, container) {
				if (err) {
					callback(err);
					return;
				}

				self.containers.destination = container;
				self._getFiles(callback);
			});
		}
		else {
			self._getFiles(callback);
		}
	});
};

Container.prototype._getFiles = function(callback) {
	var self = this;

	self.client.source.getFiles(self.containers.source, function(err, files) {
		if (err) {
			callback(err);
			return;
		}

		async.forEachLimit(files, 5, function(file, next) {
			var f = new File(self, file);
			f.sync(function(err, data) {
				if (err) {
					callback(err);
					return;
				}

				if (data) {
					self.totalBytes += data.size || 0;
					self.filesProcessed += data.skipped ? 0 : 1;
					self.filesSkipped += data.skipped ? 1 : 0;
				}

				next();
			});

		}, function(err) {
			if (err) {
				callback(err);
				return;
			}

			callback(null, {
				totalBytesTransferred: self.totalBytes,
				filesProcessed: self.filesProcessed,
				filesSkipped: self.filesSkipped
			});
		});
	});
};

module.exports = Container;