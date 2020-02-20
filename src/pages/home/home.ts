import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { HttpClient } from '@angular/common/http';
import { Camera } from '@ionic-native/camera';
import { Platform, ActionSheetController, LoadingController } from 'ionic-angular';
import { File } from '@ionic-native/file';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage {
  isImage: boolean = false;
  base64:  string = '';
  _zone:   any;

  constructor(
    private camera: Camera,
    public navCtrl: NavController,
    public platform: Platform,
    public loadingCtrl: LoadingController,
    public http: HttpClient,
    public file: File,
    public actionsheetCtrl: ActionSheetController) {
  }

  openMenu() {
    this.takePicture();
  }

  takePicture() {
    let loader = this.loadingCtrl.create({
      content: 'Proszę czekać...'
    });
    loader.present();

    this.camera.getPicture({
      quality: 100,
      destinationType : this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      targetHeight: 1000,
      correctOrientation: true
    }).then((imageData) => {
     loader.dismissAll();
     this.base64 = imageData;
     this.isImage = true;
     this.analyze();
    }, (err) => {
      console.log(`ERROR -> ${JSON.stringify(err)}`);
    });
  }

  fone(callback){
    console.log ("orcJPG")
    let loader = this.loadingCtrl.create({
      content: 'ETAP 1: Odczytywanie zdjęcia. Proszę czekać...'
    });
    loader.present();
    
    var dataObj = {
      "requests": [{
          "image": {
            "content": this.base64
          },
          "features": [{
              "type": "TEXT_DETECTION"
          }]
      }]
    };

    var apiKey = "";
    this.http.post('https://vision.googleapis.com/v1/images:annotate?key='+apiKey, dataObj)
      .subscribe((data: any) => {
        loader.dismissAll();
        if (data.responses[0].fullTextAnnotation !== undefined) {
          callback.apply(this,[data.responses[0].fullTextAnnotation]);
        } else {
          console.log (data);
          alert("Wystąpił błąd! Nie odczytano danych z obrazu poprzez Google API. Sprawdź podłączenie z internetem. (ERR-1)");
          loader.dismissAll();
        }
      }, (err) => {
        console.log (err);
        alert("Wystąpił błąd! Nie odczytano danych z obrazu poprzez Google API. Sprawdź podłączenie z internetem. (ERR-2)");
        loader.dismissAll();
      })
  }

  isValidDate(dateString) {
    var regEx = /^\d{4}-\d{2}-\d{2}$/;
    return dateString.match(regEx) != null;
  }

  ftwo(callback, text){
    console.log ("analyzeText")
    let loader = this.loadingCtrl.create({
      content: 'ETAP 2: Analizowanie tekstu. Proszę czekać...'
    });
    loader.present();
    var fakturaNR = "";
    var data      = "";
    var kwotaN    = "";
    var kwotaB    = "";
  
    text = text.text.split("\n");
    console.log (text);
    for (var i=0; i<text.length; i++) {
      console.log(text[i]);
      console.log(text[i].search("FAKTURA VAT NR"));
      console.log(this.isValidDate(text[i]));
      console.log(text[i].search("Netto"));
      console.log(text[i].search("SUMA PLN"));

      if (text[i].search("FAKTURA VAT") != -1) {
        fakturaNR = text[i].substr(16);
      }
      
      if (this.isValidDate(text[i]) == true) {
        data = text[i];
      }
      
      if (text[i].search("SUMA PLN") != -1) {
        kwotaB = text[i+1];
        kwotaN = text[i-1];
      }
    }
    
    if ((fakturaNR == "") || (data == "") || (kwotaN == "") || (kwotaB == "") || (isNaN(parseFloat(kwotaB))) || (isNaN(parseFloat(kwotaN)))) {
      console.log (fakturaNR+"; "+data+"; "+kwotaN+"; "+kwotaB);
      alert("Wystąpił błąd! Nie wszystkie dane zostały poprawnie odczytane. (ERR-3)");
      loader.dismissAll();
    } else {
      loader.dismissAll();
      callback.apply(this,[fakturaNR, data, kwotaN, kwotaB]);
    }
  }

  ftree(callback, fakturaNR, data, kwotaN, kwotaB){
    console.log ("exportText");
    let loader = this.loadingCtrl.create({
      content: 'ETAP 3: Zapisywanie danych. Proszę czekać...'
    });
    loader.present();

    this.file.checkFile(this.file.externalRootDirectory, 'bp_fv.csv').then(_ => {
      console.log('File exists.');
      this.file.writeFile(this.file.externalRootDirectory, 'bp_fv.csv',"\n"+data+";"+fakturaNR+";"+kwotaN+";"+kwotaB, {append: true, replace: false}).then(_ => {
        console.log ("exportText1");
        loader.dismissAll();
        alert("Dane zostały zapisane na karcie SD.");
        callback.apply(this,[]);
      }).catch(err => {
        alert("Wystąpił błąd! Nie zapisano danych w pliku tekstowym. (ERR-4)");
        console.log('Init data not wrote to file.');
        loader.dismissAll();
      });
    }).catch(err => {
      console.log('File doesn\'t exist.'); 
      this.file.writeFile(this.file.externalRootDirectory, 'bp_fv.csv',"data;faktura nr;kwota netto;kwota brutto;\n"+data+";"+fakturaNR+";"+kwotaN+";"+kwotaB).then(_ => {
        console.log ("exportText2");
        loader.dismissAll();
        alert("Dane zostały zapisane na karcie SD.");
        callback.apply(this,[]);
      }).catch(err => {
        alert("Wystąpił błąd! Nie zapisano danych w pliku tekstowym. (ERR-5)");
        console.log('Init data not wrote to file.');
        loader.dismissAll();
      });
    });
  }

  analyze() {
    this.fone(function(res) {
      this.ftwo(function(res2, res3, res4, res5){
        this.ftree(function() {
          console.log ("done");
        }, res2, res3, res4, res5);
      }, res)
    });
  }
}