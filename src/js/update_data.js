  //--------------------------------------------------
  //Global Varible
  //--------------------------------------------------
  //BlueJellyのインスタンス生成
  const ble = new BlueJelly();
  var state = 'default';
  var isGetThreshold = false;

  var char_index = 0;
  var mode_index = 0; // 0=idle,1=period fft,2=period raw,3=wakeup fft,4=wakeup raw
  var sample_freq_index = 0; // 0=26667Hz,1=26667/16Hz, 2=26667/64Hz
  var xdata = new Array(1024);
  var ydata = new Array(1024);
  var xrawdata = new Array(2048);
  var yrawdata = new Array(2048);
  var scatterFFTData = [];
  var scatterRawData = [];
  var threshData = [];
  var readCnt = 0;

  var freq_cnt = 0;

  function isDataNormal(fftDataArray,threshDataArray){
    if(freq_cnt > 0 && freq_cnt < 6){
        
        var error_detect_start_freqs = new Array(freq_cnt);
        var error_detect_end_freqs = new Array(freq_cnt);
        var start_index = new Array(freq_cnt);
        var end_index = new Array(freq_cnt);
        var error_detect_params_thresholds = new Array(freq_cnt);

        // Check whether parameters are valid
        for(var i = 0; i < freq_cnt; i++)
        {
            error_detect_start_freqs[i] = threshDataArray[4 * i].x;
            error_detect_end_freqs[i] = threshDataArray[4 * i + 3].x;
            error_detect_params_thresholds[i] = threshDataArray[4*i + 1].y;
            if(error_detect_start_freqs[i] >= error_detect_end_freqs[i])
            {
              console.log('Threshold is not valid');  
              return 2;
            }
            else
            {
                if(sample_freq_index === 0){
                  start_index[i] = Math.ceil(error_detect_start_freqs[i] / 13.021); // 13.021 = 26667/2048
                  end_index[i] = Math.ceil(error_detect_end_freqs[i] / 13.021);
                }else if(sample_freq_index === 1){
                  start_index[i] = Math.ceil(error_detect_start_freqs[i] / 0.81381); // 0.81381 = 1666.6875/2048
                  end_index[i] = Math.ceil(error_detect_end_freqs[i] / 0.81381);
                }

            }
        }

        if(freq_cnt > 1)
        {
            for(var i = 0; i < freq_cnt; i++) {
                if(error_detect_start_freqs[i+1] < error_detect_end_freqs[i]){
                  console.log('Threshold is not valid');    
                  return 2;
                }
            }
        }
        // Check ends
        //console.log('First freq pair is ' + fftDataArray[start_index[0]].x + ',' + fftDataArray[end_index[0]].x);

        for(var i = 0; i < freq_cnt; i++){
            for(var j = start_index[i]; j < end_index[i];j++){
                if(fftDataArray[j].y > error_detect_params_thresholds[i]){
                    return false;
                }
            }
        }

        return true;
    }
    else
    {
        console.log('Threshold is not valid');  
        return 2;
    } 
  }

  // Draw chart part
  const fftctx = document.getElementById('fftChart');
  const rawdatactx = document.getElementById('rawChart');

  const fftdata = {
    datasets: [{
      type: 'line', 
      label: 'FFT data',
      data: scatterFFTData,
      borderColor: 'blue', 
      showLine: true,
      fill: false, 
      pointRadius: 1,
      pointHoverRadius: 1
    },
    {
      type: 'line', 
      label: 'Thresholds',
      data: threshData,
      backgroundColor: 'rgb(255, 0, 0)',
      borderColor: 'red',
      showLine: true, 
      fill: false,
      hidden: true,
      pointRadius: 1,
      pointHoverRadius: 1
    }]
  };

  const fftconfig = {
    type: 'scatter', // use scatter chart
    data: fftdata,
    options: {
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0, // minimum of x axis
          max: 200, // maximum of x axis
          title: {
            display: true,
            text: 'Frequency[Hz]'
          }      
        },
        y: {
          min: 0, // minimum of y axis
          max: 1200, // maximum of y axis
          title: {
            display: true,
            text: 'Acceleration[mg]'
          }        
        }
      }
    }
  };

  const rawdata = {
    datasets: [{
      type: 'line', 
      label: 'raw data',
      data: scatterRawData,
      borderColor: 'blue', 
      showLine: true, 
      fill: false, 
      pointRadius: 1,
      pointHoverRadius: 1
    }]
  };

  const rawconfig = {
    type: 'scatter', // Use scatter chart
    data: rawdata,
    options: {
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 1, // minimum of x axis
          max: 2048, // maximum of x axis
          title: {
            display: true,
            text: 'time[1/ODR]'
          }      
        },
        y: {
          min: -2000, // minimum of y axis
          max: 2000, // maximum of y axis
          title: {
            display: true,
            text: 'Acceleration[mg]'
          }        
        }
      }
    }
  };

  const fftChart = new Chart(fftctx, fftconfig);
  const rawChart = new Chart(rawdatactx, rawconfig);

  //--------------------------------------------------
  //ロード時の処理
  //--------------------------------------------------
  window.onload = function () {
    //UUIDの設定
    ble.setUUID("NOTIFY_UUID", BlueJelly.HVE1489_SERVICE, BlueJelly.HVE1489_TX_CHARACTERISTIC);
    ble.setUUID("MODE_UUID", BlueJelly.HVE1489_SERVICE, BlueJelly.HVE1489_MODE_CHARACTERISTIC);
    ble.setUUID("THRESHOLD_UUID", BlueJelly.HVE1489_SERVICE, BlueJelly.HVE1489_PARAM_CHARACTERISTIC);
    ble.setUUID("PERIOD_UUID", BlueJelly.HVE1489_SERVICE, BlueJelly.HVE1489_PERIOD_CHARACTERISTIC);
    for (var i = 0; i < xdata.length; i++) {
      xdata[i] = (i * 1666.6875/2048).toFixed(2);
      ydata[i] = 0;
      scatterFFTData.push({ x: xdata[i], y: ydata[i] });
    }
    // Number of Threshold value pair is 5 and every threshold pair needs 4 points.
    for (var i = 0; i < 20; i++) {
      threshData.push({ x: 0, y: 0 });
    }
    for (var i = 0; i < xrawdata.length; i++) {
      xrawdata[i] = i + 1;
      yrawdata[i] = 0;
      scatterRawData.push({ x: xrawdata[i], y: yrawdata[i] });
    }

    fftChart.update();
    rawChart.update();
  }


  //--------------------------------------------------
  //Custom check data function
  //--------------------------------------------------
  function checkFisrtData(data,header,length) {
      var checkHeader = false;
      var checkZeroes = true;

      // check header and length
      if (data.getUint16(0) === header && data.getUint16(2) === length) {
          checkHeader = true;
      }
      // check zeroes
      if(checkHeader !== false){
        for (let i = 13; i < 244; i++) {
          if (data.getUint8(i) !== 0) {
            checkZeroes = false;
            break;
          }
        }
      }
      // console.log('checkHeader is '+ (data.getUint16(0) === header));
      // console.log('checkLength is '+ (data.getUint16(2) === length));
    
      return checkHeader && checkZeroes;
  }

  function checkLastData(data,zero_length) {
      var checkZeroes = true;

      // check zeroes
      for (let i = 244 - zero_length; i < 244; i++) {
        if (data.getUint8(i) !== 0) {
          checkZeroes = false;
          break;
        }
      }    
      return checkZeroes;
  }

  //--------------------------------------------------
  //Scan後の処理
  //--------------------------------------------------
  ble.onScan = function (deviceName) {
    document.getElementById('device_name').innerHTML = deviceName;
    document.getElementById('data_status').innerHTML = "found device!";
  }


  //--------------------------------------------------
  //ConnectGATT後の処理
  //--------------------------------------------------
  ble.onConnectGATT = function (uuid) {
    console.log('> connected GATT!');

    document.getElementById('uuid_name').innerHTML = uuid;
    document.getElementById('data_status').innerHTML = "connected GATT!";
  }


  //--------------------------------------------------
//Read後の処理：得られたデータの表示など行う
//--------------------------------------------------
ble.onRead = function (data, uuid){
  // console.log("UUID of received data is " + ble.hashUUID[uuid].characteristicUUID);
  // Read notify data
  //if(char_index === 7)
  if(ble.hashUUID[uuid].characteristicUUID === BlueJelly.HVE1489_TX_CHARACTERISTIC)
  {
    //console.log("UUID of received data is "+ ble.hashUUID[uuid].characteristicUUID);
    //console.log("UUID of notify char is "+ BlueJelly.HVE1489_TX_CHARACTERISTIC);
    document.getElementById('uuid_name').innerHTML = uuid;
    document.getElementById('data_status').innerHTML = "read notify data"

    if(checkFisrtData(data,0x0002,0x1000))
    {
      // Read fft data header
      console.log('FFT data header received');
      readCnt = 0;
      mode_index = 2;

      console.log("Operation mode index is "+data.getUint8(6));
      if(data.getUint8(6) <=5 ){
        sample_freq_index = 0;
        for (var i = 0; i < xdata.length; i++) {
          scatterFFTData[i].x = (i * 26667/2048).toFixed(2);
        }
        fftChart.options.scales.x.max = 6000;
        fftChart.update();
      } else if(data.getUint8(6) <=9){
        sample_freq_index = 1;
        for (var i = 0; i < xdata.length; i++) {
          scatterFFTData[i].x = (i * 1666.6875/2048).toFixed(2);
        }
        fftChart.options.scales.x.max = 200;
        fftChart.update();
      } 

      var bat_v = data.getUint16(7)/4096*3.6;
      var temp = data.getInt32(9) * 0.25;
      //console.log("Battery voltage is " + data.getUint8(7) + " and " + data.getUint8(8));

      document.getElementById('data_name').innerHTML = "Bat. "+ bat_v.toFixed(2) + "V.<br>Temp. " + temp + "&#8451;";


    } 
    else if(checkLastData(data,52) && (mode_index === 2))
    {
      // Read fft data footer
      // For this case, the last data packet has 48(x4) data and 13(x4) zeros
      for (var i = 0; i < 48; i++) {
        ydata[61 * readCnt + i] = data.getFloat32(4*i,true).toFixed(2);
      }
      readCnt = readCnt + 1;
      // console.log('FFT data read' + readCnt + 'times');
      readCnt = 0;
      console.log('FFT data footer received');
      // Updata y data in scatterFFTData by ydata array
      for (var i = 0; i < scatterFFTData.length; i++) {
        scatterFFTData[i].y = ydata[i];
      }
      fftChart.update();

      if(isGetThreshold === true){
        if(isDataNormal(scatterFFTData,threshData) === true){
          state = 'normal';
          document.getElementById('detection_status').innerHTML = 'Normal data';
          console.log('Data is normal!');
        }else if(isDataNormal(scatterFFTData,threshData) === false) {
          state = 'error';
          document.getElementById('detection_status').innerHTML = 'Abnormal data, please check';
          console.log('Data is abnormal!');
        }else if (isDataNormal(scatterFFTData,threshData) === 2){
          state = 'error';
          document.getElementById('detection_status').innerHTML = 'Error threshold, please check';
          console.log('Threshold is abnormal!');
        }
      } else {
        state = 'default';
        document.getElementById('detection_status').innerHTML = 'Thresh unknown, indicator disabled';
      }
      const stateChangedEvent = new CustomEvent('stateChanged');
      document.getElementById('indicator').dispatchEvent(stateChangedEvent);
      // console.log('status change event is dispatched');
    } 
    else 
    {  
      if(mode_index === 2)
      {
        // Read FFT data, FFT data is float
        for (var i = 0; i < data.byteLength/4; i++) {
          ydata[61 *readCnt + i] = data.getFloat32(4*i,true).toFixed(2);
        }
        readCnt = readCnt + 1;
        // console.log('Raw data read' + readCnt + 'times');
      }
    }

    if(checkFisrtData(data,0x0001,0x2000))
    {
      // Read raw data header
      console.log('Raw data header received');
      readCnt = 0;
      mode_index = 1;

      console.log("Operation mode index is "+data.getUint8(6));

      var bat_v = data.getUint16(7)/4096*3.6;
      var temp = data.getInt32(9) * 0.25;
      //console.log("Battery voltage is " + data.getUint8(7) + " and " + data.getUint8(8));

      document.getElementById('data_name').innerHTML = "Battery voltage is "+ bat_v.toFixed(2) + "V.<br>Temperature is " + temp + "&#8451;";

    }
    else if(checkLastData(data,52) && (mode_index === 1))
    {
      // Read raw data footer
      // For this case, the last data packet has 96(x2) data and 26(x2) zeros
      for (var i = 0; i < 96; i++) {
        yrawdata[122 * readCnt + i] = (data.getInt16(2*i,true) * 0.244).toFixed(2);
      }

      readCnt = readCnt + 1;
      // console.log('Raw data read' + readCnt + 'times');
      readCnt = 0;
      console.log('Raw data footer received');
      // Updata y data in scatterRawData by yrawdata array
      for (var i = 0; i < scatterRawData.length; i++) {
        scatterRawData[i].y = yrawdata[i];
      }
      rawChart.update();
    } 
    else 
    {
      if(mode_index === 1)
      {
        // Read raw data, FFT data is int16_t
        for (var i = 0; i < data.byteLength/2; i++) {
          yrawdata[122 *readCnt + i] = (data.getInt16(2*i,true) * 0.244).toFixed(2);
        }
        readCnt = readCnt + 1;
        // console.log('Raw data read' + readCnt + 'times');
      } 
    }

  } 
  // Read mode
  //else if(char_index === 2)
  else if(ble.hashUUID[uuid].characteristicUUID === BlueJelly.HVE1489_MODE_CHARACTERISTIC)
  {
    document.getElementById('uuid_name').innerHTML = uuid;
    document.getElementById('data_status').innerHTML = "mode read"

    value = data.getUint8(0);
    console.log("mode index is "+ value);
    switch(value){
    case 0:
      document.getElementById('data_name').innerHTML = "idle mode";
      mode_index = 0;
      break;
    case 1:
      document.getElementById('data_name').innerHTML = "period raw data mode";
      mode_index = 1;
      sample_freq_index = 0;
      break;
    case 2:
      document.getElementById('data_name').innerHTML = "period fft mode";
      mode_index = 2;
      sample_freq_index = 0;
      for (var i = 0; i < xdata.length; i++) {
        scatterFFTData[i].x = (i * 26667/2048).toFixed(2);
      }
      fftChart.options.scales.x.max = 6000;
      fftChart.update();

      break;
    case 3:
      document.getElementById('data_name').innerHTML = "wake up raw data mode";
      mode_index = 3;
      sample_freq_index = 0;
      break;
    case 4:
      document.getElementById('data_name').innerHTML = "wake up fft mode";
      mode_index = 4;
      sample_freq_index = 0;
      break;
    case 5:
      document.getElementById('data_name').innerHTML = "Low freq period raw data mode";
      mode_index = 1;
      sample_freq_index = 1;
      break;
    case 6:
      document.getElementById('data_name').innerHTML = "Low freq period fft mode";
      mode_index = 2;
      sample_freq_index = 1;
      for (var i = 0; i < xdata.length; i++) {
        scatterFFTData[i].x = (i * 1666.6875/2048).toFixed(2);
      }
      fftChart.options.scales.x.max = 200;
      fftChart.update();

      break;
    case 7:
      document.getElementById('data_name').innerHTML = "Low freq wake up raw data mode";
      mode_index = 3;
      sample_freq_index = 1;
      break;
    case 8:
      document.getElementById('data_name').innerHTML = "Low freq wake up fft mode";
      mode_index = 4;
      sample_freq_index = 1;
      break;
    case 9:
      document.getElementById('data_name').innerHTML = "Ultra low freq period raw data mode";
      mode_index = 1;
      break;
    case 10:
      document.getElementById('data_name').innerHTML = "Ultra low freq period fft mode";
      mode_index = 2;
      break;
    case 11:
      document.getElementById('data_name').innerHTML = "Ultra low freq wake up raw data mode";
      mode_index = 3;
      break;
    case 12:
      document.getElementById('data_name').innerHTML = "Ultra low freq wake up fft mode";
      mode_index = 4;
      break;

    default:
      document.getElementById('data_name').innerHTML = "unsupported mode index";
    }
    
  }
  // Read threshold
  //else if(char_index === 5)
  else if(ble.hashUUID[uuid].characteristicUUID === BlueJelly.HVE1489_PARAM_CHARACTERISTIC)
  {
    document.getElementById('uuid_name').innerHTML = uuid;
    document.getElementById('data_status').innerHTML = "threshold read"

    //console.log('Data length is '+data.byteLength);
    freq_cnt = data.getUint8(0);
    console.log("freq cnt is "+ freq_cnt);
    // Reset all data
    for(var i = 0; i < threshData.length; i++){
      threshData[i].x = 0;
      threshData[i].y = 0;
    } 

    if( freq_cnt !== 0){
      document.getElementById('data_name').innerHTML = "read " + freq_cnt + " threshold";
      document.getElementById('thresholdNumber').value = freq_cnt;
      document.getElementById('thresholdNumber').dispatchEvent(new Event('change'));

      for(var i = 0; i < freq_cnt; i++) {
        var freq_threshold = data.getUint8(i+1) * 20;
        var freq_start = data.getUint8(i+6) * 25;
        var freq_end = data.getUint8(i+11) * 25;
        threshData[4*i].x = freq_start;
        threshData[4*i].y = 0;
        threshData[4*i+1].x = freq_start;
        threshData[4*i+1].y = freq_threshold;
        threshData[4*i+2].x = freq_end;
        threshData[4*i+2].y = freq_threshold;
        threshData[4*i+3].x = freq_end;
        threshData[4*i+3].y = 0;
        
        var param_index = i+1;
        document.getElementById("start_freq" + param_index).value = freq_start;
        document.getElementById("end_freq" + param_index).value = freq_end;
        document.getElementById("threshold" + param_index).value = freq_threshold;

      }

    }else {
      document.getElementById('data_name').innerHTML = "No threshold was set";
    }
    fftChart.getDatasetMeta(1).hidden = false;
    fftChart.update();
  }
  else if(ble.hashUUID[uuid].characteristicUUID === BlueJelly.HVE1489_PERIOD_CHARACTERISTIC)
  {
    document.getElementById('uuid_name').innerHTML = uuid;
    document.getElementById('data_status').innerHTML = "period read"

    value = data.getUint8(0);
    console.log("value of period is "+ value);
    if(value === 0){
      document.getElementById('data_name').innerHTML = "Quick TX mode";
    }else{
      document.getElementById('data_name').innerHTML = "Period is " + value + "s";
    }
  }

}

//--------------------------------------------------
//Write後の処理
//--------------------------------------------------
ble.onWrite = function(uuid){
  document.getElementById('uuid_name').innerHTML = uuid;
  document.getElementById('data_status').innerHTML = "data wriiten"
}


//--------------------------------------------------
//Start Notify後の処理
//--------------------------------------------------
ble.onStartNotify = function(uuid){
  console.log('> Start Notify!');

  document.getElementById('uuid_name').innerHTML = uuid;
  document.getElementById('data_status').innerHTML = "start Notify";
}


//--------------------------------------------------
//Stop Notify後の処理
//--------------------------------------------------
ble.onStopNotify = function(uuid){
  console.log('> Stop Notify!');

  document.getElementById('uuid_name').innerHTML = uuid;
  document.getElementById('data_status').innerHTML = "stop Notify";
}

//--------------------------------------------------
//Disconnect状態時の処理
//--------------------------------------------------
ble.onDisconnect = function() {
  document.getElementById('uuid_name').innerHTML = "Not Connected";
  document.getElementById('data_status').innerHTML = "disconnected";
}


//--------------------------------------------------
//Clear状態時の処理
//--------------------------------------------------
ble.onClear = function() {
  document.getElementById('device_name').innerHTML = "No Device";
  document.getElementById('uuid_name').innerHTML = "cleared";
  document.getElementById('data_status').innerHTML = "cleared";
  document.getElementById('data_name').innerHTML = "No data ";
}


//--------------------------------------------------
//Reset後の処理
//--------------------------------------------------
ble.onReset = function() {
  document.getElementById('device_name').innerHTML = "No Device";
  document.getElementById('uuid_name').innerHTML = "Not Connected";
  document.getElementById('data_status').innerHTML = "cleared";
}

//--------------------------------------------------
//Error後の処理
//--------------------------------------------------
ble.onError = function(error){
  document.getElementById('data_status').innerHTML = "ERROR : " + error;
}

//-------------------------------------------------
//ボタンが押された時のイベント登録
//--------------------------------------------------
document.getElementById('startNotifyBtn').addEventListener('click', function() {
      char_index = 7;
      ble.startNotify('NOTIFY_UUID');
});

document.getElementById('stopNotifyBtn').addEventListener('click', function() {
      ble.stopNotify('NOTIFY_UUID');
});

document.getElementById('getModeBtn').addEventListener('click', function() {
      char_index = 2;
      ble.read('MODE_UUID');
});

document.getElementById('getThresholdBtn').addEventListener('click', function() {
      char_index = 5;
      isGetThreshold = true;
      ble.read('THRESHOLD_UUID');
});

document.getElementById('getPeriodBtn').addEventListener('click', function() {
      char_index = 3;
      ble.read('PERIOD_UUID');
});

document.getElementById('disconnectBtn').addEventListener('click', function() {
      ble.reset();

      for (var i = 0; i < xdata.length; i++) {
        scatterFFTData[i].x = (i * 26667/2048).toFixed(2);
        scatterFFTData[i].y = 0;
      }
      // Number of Threshold value pair is 5 and every threshold pair needs 4 points.
      for (var i = 0; i < 20; i++) {
        threshData[i].x = 0;
        threshData[i].y = 0;
      }
      for (var i = 0; i < xrawdata.length; i++) {
        scatterRawData[i].x = i+1;
        scatterRawData[i].y = 0;
      }

      fftChart.update();
      rawChart.update();

      isGetThreshold = false;
      state = 'default';
      document.getElementById('detection_status').innerHTML = 'No data, indicator disabled';
      const stateChangedEvent = new CustomEvent('stateChanged');
      document.getElementById('indicator').dispatchEvent(stateChangedEvent);

});

document.getElementById('setModeBtn').addEventListener('click', function() {
  console.log("Set mode!");
  var mode = document.getElementById('modeSelect');
  var mode_text = mode.options[mode.selectedIndex].text;
  var samplingFreqIndex = document.getElementById('samplingFreqSelect').selectedIndex;
  console.log("samplingFreqIndex is "+samplingFreqIndex);

  if(mode_text === 'Period-FFT'){
    var fft_mode = new Uint8Array([0x02 + 4 * samplingFreqIndex]);
    ble.write('MODE_UUID', fft_mode);
    mode_index = 2;
    console.log("Set fft mode!");
  }
  else if(mode_text === 'Period-Raw'){
    var raw_mode = new Uint8Array([0x01 + 4 * samplingFreqIndex]);
    ble.write('MODE_UUID', raw_mode);
    mode_index = 1;
    console.log("Set raw mode!");
  }
  else if(mode_text === 'WakeUp-Raw'){
    var wakeup_raw_mode = new Uint8Array([0x03 + 4 * samplingFreqIndex]);
    ble.write('MODE_UUID', wakeup_raw_mode);
    mode_index = 1;
    console.log("Set wake up raw mode!");
  }
  else if(mode_text === 'WakeUp-FFT'){
    var wakeup_fft_mode = new Uint8Array([0x04 + 4 * samplingFreqIndex]);
    ble.write('MODE_UUID', wakeup_fft_mode);
    mode_index = 1;
    console.log("Set wake up fft mode!");
  }
  else if(mode_text === 'IDLE'){
    var idle_mode = new Uint8Array([0x00]);
    ble.write('MODE_UUID', idle_mode);
    mode_index = 0;
    console.log("Set idle mode!");
  }
});

document.getElementById('setThresholdBtn').addEventListener('click', function() {
  console.log("Set threshold!");
  var freq_cnt_write = $("#thresholdNumber").val();
  var thresh_uint8array = new Uint8Array(16);
  thresh_uint8array[0] = freq_cnt_write;

  for(var i = 0; i < freq_cnt_write; i++){
    //set threshold,start freq,end freq
    var param_index = i+1; 
    thresh_uint8array[i+1] = document.getElementById("threshold" + param_index).value/20;
    thresh_uint8array[i+6] = document.getElementById("start_freq" + param_index).value/25;
    thresh_uint8array[i+11] = document.getElementById("end_freq" + param_index).value/25;
  }

  for(var i = 0; i < 16; i++){
    //check threshold,start freq,end freq
    console.log('Index '+i+' data is '+thresh_uint8array[i]);
  }
  
  ble.write('THRESHOLD_UUID', thresh_uint8array);

});


document.getElementById('setPeriodBtn').addEventListener('click', function() {
  console.log("Set Period!");
  var period_value_text = document.getElementById('periodInputText').value.trim();
  console.log("period text is " + period_value_text);
  var period_value = parseInt(period_value_text , 10);
  if (isNaN(period_value) || period_value < 0 || period_value > 255) {
    throw new Error('Input must be a valid number between 0 and 255');
  }
  console.log("Period value is " + period_value);

  var period = new Uint8Array([period_value]);
  ble.write('PERIOD_UUID', period);
  console.log("Set period to " + period_value);
  
});


document.getElementById('saveDataBtn').addEventListener('click', function() {

  if(mode_index === 1){
    var filename = 'rawdata_' + getCurrentTimestamp() + '.csv';
    var save_data_array = new Array(2048);
    for(var i = 0; i < 2048; i++){
      save_data_array[i] = scatterRawData[i].y;
    }
    var blob = new Blob([save_data_array.join("\n")], {type: "text/plain;charset=utf-8"});
    saveAs(blob, filename);
  }
  else if (mode_index === 2){
    var filename = 'fftdata_' + getCurrentTimestamp() + '.csv';
    var save_data_array = new Array(1024);
    for(var i = 0; i < 1024; i++){
        save_data_array[i] = scatterFFTData[i].x + ',' + scatterFFTData[i].y; 
    }
    var blob = new Blob([save_data_array.join("\n")], {type: "text/plain;charset=utf-8"});
    saveAs(blob, filename);
  }

});
