import { Component } from '@angular/core';
import * as d3 from 'd3';

function IsNumeric(input)
{
    // eslint-disable-next-line
    return (input - 0) == input && (''+input).trim().length > 0;
}

const data_6h_file: string = './assets/data/expected_wastage_rate_6hour.csv';
const data_28d_file: string = './assets/data/expected_wastage_rate_28day.csv';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  data_6hr: Array<string> = [];
  data_28day: Array<string> = [];
  numDosesAdministered: number;                       // 50000
  numLocations: number;                               // 200
  numDays: number;                                    // 10
  closedVialWastage: number = 0;                      // 1
  numStorageLevels: number = 1;                       // 3
  closedVialWastageCheckbox: boolean = false;
  openedVialWastage: number = 0;                      // 5
  openedVialWastageCheckbox: boolean = false;
  meanDosesAdministered: number;
  numSessions: number;
  expected_wastage: {};
  expectedWastageOutput: Array<string> = ['-', '-', '-', '-', '-', '-', '-', '-']; 
  forecastNeedOutput: Array<string> = ['-', '-', '-', '-', '-', '-', '-', '-']; 

  constructor() { 
    d3.csv(data_6h_file).then(data => {
        this.data_6hr = data;
        d3.csv(data_28d_file).then(data => {
          this.data_28day = data;
          this.displayResultsTable();
        });
    });

    const fieldsArray = ['numDosesAdministered', 'numLocations', 'numDays', 'closedVialWastage', 'numStorageLevels', 
    'closedVialWastageCheckbox', 'openedVialWastage', 'openedVialWastageCheckbox'];
    if(localStorage) {
        for (let field of fieldsArray) {
          let val = localStorage.getItem(field);
          if(field.includes('Checkbox')) {
            this[field] = val === 'true' ? true : false;             
          }
          else {
            this[field] = +val;                
          }
      }   
    }
  }

  handleInputChange(name: string, value: any): void {
    if (!name.includes('Checkbox') && value.length > 0 && !IsNumeric(value)) {
      alert('Input values must be numeric');
      return;
    }  
    
    if(name.includes('Checkbox')) {
      value = Boolean(value);
    } 
    else {
      value = Number(value);
    }

    if(localStorage) {
      localStorage.setItem(name, value);
    }
    
    this[name] = value;
    this.displayResultsTable();
  }

  displayResultsTable() : void {
    if (['numDays', 'numLocations', 'numDosesAdministered'].every(key => this[key] && isFinite(this[key]))) {
      this.calculateParams();
    }
  }

  calculateParams(): void {
    this.numSessions = Number(this.numDays) * Number(this.numLocations);
    this.meanDosesAdministered = this.numDosesAdministered / this.numSessions;
    this.findExpectedWastage();
  }

  findRowIndex(data_array: any): number {
    let idx = null;
    for (let i=0; i<data_array.length-1; i++) {
        if (+data_array[i]['mean doses per period'] <= this.meanDosesAdministered
        && this.meanDosesAdministered <= data_array[i+1]['mean doses per period']) {
            idx = i;
        }
    }
    return idx;
  }

  calcExpectedWastage = (data_array, idx, dosesPerVial) => {
    const exp_wastage1: number = +data_array[idx][dosesPerVial + ' dose vial'];
    const exp_wastage2: number = +data_array[idx+1][dosesPerVial + ' dose vial'];
    const mean_doses1: number = +data_array[idx]['mean doses per period']
    const mean_doses2: number = +data_array[idx+1]['mean doses per period']
    const calculated_mean_doses: number = this.meanDosesAdministered;

    let expected_wastage: number = (exp_wastage1) 
                          + ((calculated_mean_doses - mean_doses1) / (mean_doses2 - mean_doses1)) 
                          * (exp_wastage2 - exp_wastage1);

    const Wc = this.closedVialWastageCheckbox ? this.closedVialWastage / 100 : 0;
    const n  = this.closedVialWastageCheckbox ? this.numStorageLevels : 0;
    const Wo = this.openedVialWastageCheckbox ? this.openedVialWastage / 100 : 0;

    expected_wastage = 1 - (1 - expected_wastage) * ((1 - Wc) ** n) * (1 - Wo);

    if (expected_wastage > 1.0)
        expected_wastage = 1.0;
      
    return expected_wastage;
  }

  findExpectedWastage(): void {
    const expected_wastage_obj = {
        '6hr': {},
        '28day': {}
    };
    for (let discardPeriod of ['6hr', '28day']) {
        const data_array = this['data_' + String(discardPeriod)];
        const idx = this.findRowIndex(data_array);
        if (idx) {
            for (let dosesPerVial of [2, 5, 10, 20]) {
                expected_wastage_obj[discardPeriod][dosesPerVial] = this.calcExpectedWastage(data_array, idx, dosesPerVial);
            }
        }
    }
    this.expected_wastage = expected_wastage_obj;
    this.createOutputArrays();
  }

  createOutputArrays() {
    const discardPeriods: Array<string> = ['6hr', '28day'];
    const dosesPerVialsArray: Array<number> = [2, 5, 10, 20];
    this.expectedWastageOutput = []; 
    this.forecastNeedOutput = []; 
    let temp;
    for (let discardPeriod of discardPeriods) {
        dosesPerVialsArray.forEach(dosesPerVial => {
            const exp_wastage_val = this.expected_wastage[discardPeriod][dosesPerVial];
            const exp_wastage_pc = 100 * exp_wastage_val;
            const forecast_need = Math.ceil((this.numDosesAdministered / (1 - exp_wastage_val)) / dosesPerVial);
            temp = isNaN(exp_wastage_pc) ? '-' : exp_wastage_pc.toFixed(1).toString() + '%';
            this.expectedWastageOutput.push(temp);
            temp = isNaN(forecast_need) ? '-' : forecast_need.toFixed(0).toString();
            this.forecastNeedOutput.push(temp);
        });
    }
  }
}
