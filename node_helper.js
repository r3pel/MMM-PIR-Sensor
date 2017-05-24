'use strict';

/* Magic Mirror
 * Module: MMM-PIR-Sensor
 *
 * By Paul-Vincent Roll http://paulvincentroll.com
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Gpio       = require('onoff').Gpio;
const exec       = require('child_process').exec;
const moment     = require('moment');

module.exports = NodeHelper.create({

    isLoaded:     false,
    config:       null,
    pir:          null,
    relay:        null,
    offTimer:     null,
    currentState: true, // True == on, false == off

    /**
     * @param {String} notification
     * @param {*}      payload
     */
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'CONFIG') {
            this.initConfig(payload);
        } else if (notification === 'SCREEN_WAKEUP') {
            this.activateMonitor();
        }
    },

    /**
     * Start event
     * @param {Object} config
     */
    initConfig: function (config) {
        if (!this.isLoaded) {
            this.config = config;

            if (typeof this.config.sensorGpio === 'undefined') {
                throw new Error('sensorGpio config item not specified!');
            }

            this.pir = new Gpio(this.config.sensorGpio, 'in', 'both');

            if (typeof this.config.relayGpio !== 'undefined' && this.config.relayGpio) {
                if (typeof this.config.sensorGpio === 'undefined') {
                    throw new Error('relayOnState config item not specified!');
                }

                this.relay = new Gpio(this.config.relayGpio, 'out');
                this.relay.writeSync(this.config.relayOnState);
                this._executeHdmiOn();
            }

            this.watch();
            this.isLoaded = true;
        }
    },

    /**
     * Starts the PIR movement detection
     */
    watch: function () {
        this.log('Watching on GPIO #' + this.config.sensorGpio + ' ...');
        this.pir.watch((err, value) => {
            if (err) {
                this.log(err.message);
            } else {
                if (value) {
                    this.log('Motion detected', true);
                    this.sendSocketNotification('USER_PRESENCE', true);

                    if (this.config.powerSaving) {
                        if (this.offTimer) {
                            clearTimeout(this.offTimer);
                        }

                        this.activateMonitor();
                    }
                } else {
                    this.log('Motion no longer detected', true);
                    this.sendSocketNotification('USER_PRESENCE', false);

                    if (this.config.powerSaving) {
                        if (this.offTimer) {
                            clearTimeout(this.offTimer);
                        }

                        this.log('Turning Screen OFF in ' + this.config.turnOffAfterSeconds + ' seconds');

                        this.offTimer = setTimeout(() => {
                            this.deactivateMonitor();
                        }, this.config.turnOffAfterSeconds * 1000);
                    }
                }
            }
        });

        process.on('SIGINT', () => {
            this.log('Unexporting PIR Gpio', true);
            this.pir.unexport();
        });
    },

    /**
     * Turn on monitor
     */
    activateMonitor: function () {
        // Only turn on if not already on
        if (!this.currentState) {
            if (this.config.relayGpio != false) {
                this.log('Executing Relay Gpio #' + this.config.relayGpio + ' ON', true);
                this.relay.writeSync(this.config.relayOnState);
            } else if (this.config.relayGpio == false) {
                this._executeHdmiOn();
            }

            this.currentState = true;
            this.sendSocketNotification('SCREEN_STATE', this.currentState);
        } else {
            this.log('Not turning monitor ON, its already ON', true);
        }
    },

    /**
     * Turn off monitor
     */
    deactivateMonitor: function () {
        // Only turn off if not already off
        if (this.currentState) {
            if (this.config.relayGpio != false) {
                this.log('Executing Relay Gpio #' + this.config.relayGpio + ' OFF', true);
                this.relay.writeSync(this.config.relayOffState);
            } else if (this.config.relayGpio == false) {
                this._executeHdmiOff();
            }

            this.currentState = false;
            this.sendSocketNotification('SCREEN_STATE', this.currentState);
        } else {
            this.log('Not turning monitor OFF, its already OFF', true);
        }
    },

    /**
     * Low level, executes the external command to turn on
     *
     * @private
     */
    _executeHdmiOn: function () {
        this.log('Executing tvservice ON', true);
        exec('/opt/vc/bin/tvservice --preferred && sudo chvt 6 && sudo chvt 7', null);
    },

    /**
     * Low level, executes the external command to turn off
     *
     * @private
     */
    _executeHdmiOff: function () {
        this.log('Executing tvservice OFF', true);
        exec('/opt/vc/bin/tvservice -o', null);
    },

    /**
     * Outputs log messages
     *
     * @param {String}  message
     * @param {Boolean} [debug_only]
     */
    log: function (message, debug_only) {
        if (!debug_only || (debug_only && typeof this.config.debug !== 'undefined' && this.config.debug)) {
            console.log('[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] [MMM-PIR] ' + message);
        }
    }
});
