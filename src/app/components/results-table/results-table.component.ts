import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-results-table',
  templateUrl: './results-table.component.html',
  styleUrls: ['./results-table.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ResultsTableComponent {
  @Input() expectedWastageOutput: Array<string>; 
  @Input() forecastNeedOutput: Array<string>;

  constructor() {
    console.log('in app-results-table component');
  }

}
