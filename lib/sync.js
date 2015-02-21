var async = require('async'),
  Container = require('./container'),
  events = require('eventemitter2'),
  humanFormat = require('human-format'),
  pkgcloud = require('pkgcloud'),
  util = require('util');

var Sync = function(options) {
  events.EventEmitter2.call(this, { delimiter: '::', wildcard: true });
  this.options = options;
  this.containers = options.containers;
  this.source = pkgcloud.storage.createClient(options.source);
  this.destination = pkgcloud.storage.createClient(options.destination);
};

util.inherits(Sync, events.EventEmitter2);

/**
 * Sync.run
 *
 * @description This is where we do the application logic to sync 1 ore more containers between two pkgcloud storage clients.
 *
 * CURRENT CONSTRAINTS:
 * Less than 1000 objects
 * Objects less than 5gb
 *
 * TODO
 *
 * move pkgcloud-sync command line tools to pkgcloud-sync-cli or pkgcloud-cli
 * use env variables
 * use command line args to point to env variables for specific source/destination
 *
 * @param callback
 */
Sync.prototype.run = function(callback) {

  var self = this;

  if (self.options.enableSourceClientLogging) {
    self.source.on('log::*', function(message, object) {
      self.emit(this.event, message, object);
    });
  }

  if (self.options.enableDestinationClientLogging) {
    self.destination.on('log::*', function(message, object) {
      self.emit(this.event, message, object);
    });
  }

  self.emit('log::info', 'Starting pkgcloud-sync', {
    containers: self.containers,
    source: self.options.source.provider,
    destination: self.options.destination.provider,
    containerSuffix: self.options.containerSuffix || ''
  });

  self.totalBytesTransferred = 0;
  self.filesProcessed = 0;
  self.filesSkipped = 0;
  self.start = new Date().getTime();

  async.forEachSeries(self.containers, function(name, next) {
    var container = new Container(self, name);

    container.sync(function(err, data) {
      if (err) {
        next(err);
        return;
      }

      if (data) {
        self.totalBytesTransferred += data.totalBytesTransferred;
        self.filesProcessed += data.filesProcessed;
        self.filesSkipped += data.filesSkipped;
      }

      next();
    });
  }, function(err) {
    if (err) {
      self.emit('log::error', 'Error during sync', err);
    }

    self.emit('log::info', 'Process Complete', {
      totalBytes: humanFormat(self.totalBytesTransferred),
      totalFiles: self.filesProcessed + self.filesSkipped,
      totalUploaded: self.filesProcessed,
      totalSkipped: self.filesSkipped,
      time: new Date().getTime() - self.start
    });

    callback(err);
  });
};

module.exports = Sync;