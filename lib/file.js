var File = function(container, file) {
	this.container = container;
	this.file = file;
	this.files = {
		source: file
	};
};

File.prototype.sync = function(callback) {
	var self = this;

	self.container.client.destination.getFile(self.container.containers.destination, self.file.name, function(err, file) {
		if (err && err.statusCode !== 404 && err.code !== 404) {
			callback(err);
			return;
		}

		self.files.destination = file;

		// destination not present, lets upload it
		if (!self.files.destination) {
			self.container.client.emit('log::verbose', 'Uploading, destination file not found, ', self.file.name);
			self._upload(callback);
		}
		else if (self.files.source.etag != self.files.destination.etag) {
			self.container.client.emit('log::verbose', 'Updating, destination file differs', self.file.name);
			self._upload(callback);
		}
		else {
			self.container.client.emit('log::verbose', 'Skipping, destination file same', self.file.name);
			callback(null, { skipped: true });
		}

	});
};

File.prototype._upload = function(callback) {
	var self = this;

	var sourceStream = self.container.client.source.download({
		container: self.container.sourceContainerName,
		remote: self.file.name
	});

  sourceStream.on('error', function(err) {
		if (err) {
			self.container.client.emit('log::error', 'Source Stream Callback Error', err);
		}
	});

  sourceStream.on('response', function (response) {
    response.headers = {
      'content-type': response.headers['content-type'],
      'content-length': response.headers['content-length']
    }
  });

	var destStream = self.container.client.destination.upload({
		container: self.container.destinationContainerName,
		remote: self.file.name,
		headers: {}
	});

  destStream.on('error', function(err) {
		if (err) {
			self.container.client.emit('log::error', 'Destination Stream Callback Error', err);
		}
	});

  destStream.on('success', function (file) {
    self.container.client.emit('log::debug', 'Destination stream end', self.file.name);
    callback(null, {
      size: self.files.source.size
    });
  });

	sourceStream.pipe(destStream);
};

module.exports = File;