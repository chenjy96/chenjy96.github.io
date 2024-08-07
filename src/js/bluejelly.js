//--------------------------------------------------
//BlueJelly constructor
//--------------------------------------------------
var isModeListenerAdded = false;
var isThresholdListenerAdded = false;
var isNotifyListenerAdded = false;
var isPeriodListenerAdded = false;

var BlueJelly = function(){
  this.bluetoothDevice = null;
  this.dataCharacteristic = null;
  this.hashUUID ={};
  this.hashUUID_lastConnected;

  //callBack
  this.onScan = function(deviceName){console.log("onScan");};
  this.onConnectGATT = function(uuid){console.log("onConnectGATT");};
  this.onRead = function(data, uuid){console.log("onRead");};
  this.onWrite = function(uuid){console.log("onWrite");};
  this.onStartNotify = function(uuid){console.log("onStartNotify");};
  this.onStopNotify = function(uuid){console.log("onStopNotify");};
  this.onDisconnect = function(){console.log("onDisconnect");};
  this.onClear = function(){console.log("onClear");};
  this.onReset = function(){console.log("onReset");};
  this.onError = function(error){console.log("onError");};
}


//--------------------------------------------------
//setUUID
//--------------------------------------------------
BlueJelly.prototype.setUUID = function(name, serviceUUID, characteristicUUID){
  console.log('Execute : setUUID');
  console.log(this.hashUUID);

  this.hashUUID[name] = {'serviceUUID':serviceUUID, 'characteristicUUID':characteristicUUID};
}


//--------------------------------------------------
//scan
//--------------------------------------------------
BlueJelly.prototype.scan = function(uuid){
  return (this.bluetoothDevice ? Promise.resolve() : this.requestDevice(uuid))
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//requestDevice
//--------------------------------------------------
BlueJelly.prototype.requestDevice = function(uuid) {
  console.log('Execute : requestDevice');
  return navigator.bluetooth.requestDevice({
      // acceptAllDevices: true,
      optionalServices: [this.hashUUID[uuid].serviceUUID],
      filters: [{
        name: 'HVE1489'  // device name
      }]
    })
  .then(device => {
    this.bluetoothDevice = device;
    this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnect);
    this.onScan(this.bluetoothDevice.name);
  });
}


//--------------------------------------------------
//connectGATT
//--------------------------------------------------
BlueJelly.prototype.connectGATT = function(uuid) {
  if(!this.bluetoothDevice)
  {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }
  if (this.bluetoothDevice.gatt.connected && this.dataCharacteristic) {
    if(this.hashUUID_lastConnected == uuid)
      return Promise.resolve();
  }
  this.hashUUID_lastConnected = uuid;

  console.log('Execute : connect');
  return this.bluetoothDevice.gatt.connect()
  .then(server => {
    console.log('Execute : getPrimaryService');
    return server.getPrimaryService(this.hashUUID[uuid].serviceUUID);
  })
  .then(service => {
    console.log('Execute : getCharacteristic');
    return service.getCharacteristic(this.hashUUID[uuid].characteristicUUID);
  })
  .then(characteristic => {
    this.dataCharacteristic = characteristic;
    console.log('char uuid is ' + this.hashUUID[uuid].characteristicUUID);
    if(this.hashUUID[uuid].characteristicUUID === '4d8e0002-287d-4da4-b61c-d431c3b135a0' && isModeListenerAdded === false){
      this.dataCharacteristic.addEventListener('characteristicvaluechanged',this.dataChanged(this, uuid));
      isModeListenerAdded = true;
      console.log('mode listener added');
    }
    else if(this.hashUUID[uuid].characteristicUUID === '4d8e0005-287d-4da4-b61c-d431c3b135a0' && isThresholdListenerAdded === false){
      this.dataCharacteristic.addEventListener('characteristicvaluechanged',this.dataChanged(this, uuid));
      isThresholdListenerAdded = true;
      console.log('threshold listener added');
    }
    else if(this.hashUUID[uuid].characteristicUUID === '4d8e0007-287d-4da4-b61c-d431c3b135a0' && isNotifyListenerAdded === false){
      this.dataCharacteristic.addEventListener('characteristicvaluechanged',this.dataChanged(this, uuid));
      isNotifyListenerAdded = true;
      console.log('notify listener added');
    }
    else if(this.hashUUID[uuid].characteristicUUID === '4d8e0003-287d-4da4-b61c-d431c3b135a0' && isPeriodListenerAdded === false){
      this.dataCharacteristic.addEventListener('characteristicvaluechanged',this.dataChanged(this, uuid));
      isPeriodListenerAdded = true;
      console.log('period listener added');
    }

    this.onConnectGATT(uuid);
  })
  .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//dataChanged
//--------------------------------------------------
BlueJelly.prototype.dataChanged = function(self, uuid) {
  return function(event) {
    self.onRead(event.target.value, uuid);
  }
}


//--------------------------------------------------
//read
//--------------------------------------------------
BlueJelly.prototype.read= function(uuid) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : readValue');
    return this.dataCharacteristic.readValue();
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//write
//--------------------------------------------------
BlueJelly.prototype.write = function(uuid, array_value) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : writeValue');
    data = Uint8Array.from(array_value);
    return this.dataCharacteristic.writeValue(data);
  })
  .then( () => {
    this.onWrite(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//startNotify
//--------------------------------------------------
BlueJelly.prototype.startNotify = function(uuid) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : startNotifications');
    this.dataCharacteristic.startNotifications()
  })
  .then( () => {
    this.onStartNotify(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//stopNotify
//--------------------------------------------------
BlueJelly.prototype.stopNotify = function(uuid){
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
  console.log('Execute : stopNotifications');
  this.dataCharacteristic.stopNotifications()
})
  .then( () => {
    this.onStopNotify(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//disconnect
//--------------------------------------------------
BlueJelly.prototype.disconnect= function() {
  if (!this.bluetoothDevice) {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }

  if (this.bluetoothDevice.gatt.connected) {
    console.log('Execute : disconnect');
    this.bluetoothDevice.gatt.disconnect();

    isModeListenerAdded = false;
    isThresholdListenerAdded = false;
    isNotifyListenerAdded = false;
    isPeriodListenerAdded = false;

  } else {
   var error = "Bluetooth Device is already disconnected";
   console.log('Error : ' + error);
   this.onError(error);
   return;
  }
}


//--------------------------------------------------
//clear
//--------------------------------------------------
BlueJelly.prototype.clear= function() {
   console.log('Excute : Clear Device and Characteristic');
   this.bluetoothDevice = null;
   this.dataCharacteristic = null;
   this.onClear();
}


//--------------------------------------------------
//reset(disconnect & clear)
//--------------------------------------------------
BlueJelly.prototype.reset= function() {
  console.log('Excute : reset');
  this.disconnect(); //disconnect() is not Promise Object
  this.clear();
  this.onReset();
}

// HVE1489 UUIDs
Object.defineProperty(BlueJelly, 'HVE1489_SERVICE', {value: "4d8e0001-287d-4da4-b61c-d431c3b135a0", writable: true});
Object.defineProperty(BlueJelly, 'HVE1489_MODE_CHARACTERISTIC', {value: "4d8e0002-287d-4da4-b61c-d431c3b135a0", writable: true});
Object.defineProperty(BlueJelly, 'HVE1489_PERIOD_CHARACTERISTIC', {value: "4d8e0003-287d-4da4-b61c-d431c3b135a0", writable: true});
Object.defineProperty(BlueJelly, 'HVE1489_PARAM_CHARACTERISTIC', {value: "4d8e0005-287d-4da4-b61c-d431c3b135a0", writable: true});
Object.defineProperty(BlueJelly, 'HVE1489_TX_CHARACTERISTIC', {value: "4d8e0007-287d-4da4-b61c-d431c3b135a0", writable: true});
