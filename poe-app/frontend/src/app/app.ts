import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Provider = 'both' | 'openai' | 'gemini';
interface PersonRecord { reference_number:string; hit_indicator:string; full_name:string; name_suffix:string; address:string; city:string; state:string; zip_code:string; address_reported_date:string; employer_name:string; employer_occupation:string; employment_date_verified:string; deceased_flag:string; }
interface Candidate { company_name:string; confidence_score:number; evidence_summary:string; sources_found:string[]; }
interface FindPoeResult { full_name?:string; best_match?:Candidate; candidates?:Candidate[]; token_usage?:{ grand_total?:{ total_tokens?:number } }; }
interface PoeResponse { task_id?:string; status?:string; message?:string; result?:FindPoeResult&{ best_result?:FindPoeResult }; detail?:string; }

@Component({ selector:'app-root', imports:[CommonModule,FormsModule], templateUrl:'./app.html', styleUrl:'./app.scss' })
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  readonly records=signal<PersonRecord[]>([]); readonly selected=signal<PersonRecord|null>(null); readonly result=signal<PoeResponse|null>(null);
  readonly loadingRecords=signal(true); readonly searching=signal(false); readonly error=signal(''); readonly query=signal(''); readonly totalRecords=signal(0);
  fullName='Caleb R Harrod'; zipCode='33514'; city='Center Hill'; state='FL'; country='United States'; provider:Provider='both';
  readonly candidates=computed(()=>{
    const result=this.result()?.result;
    return result?.best_result?.candidates??result?.candidates??[];
  });
  readonly bestMatch=computed(()=>{
    const result=this.result()?.result;
    return result?.best_result?.best_match??result?.best_match??null;
  });
  ngOnInit(){ this.loadRecords(); }
  loadRecords(query=''){
    this.loadingRecords.set(true); this.error.set('');
    this.http.get<{records:PersonRecord[];total:number}>('/api/records',{params:query?{q:query}:{}}).subscribe({
      next:data=>{this.records.set(data.records);this.totalRecords.set(data.total);this.loadingRecords.set(false);if(!this.selected()&&data.records.length)this.selectRecord(data.records[0]);},
      error:()=>{this.loadingRecords.set(false);this.error.set('The backend is not reachable. Start the app server and try again.');}
    });
  }
  onFilter(value:string){this.query.set(value);this.loadRecords(value.trim());}
  selectRecord(record:PersonRecord){this.selected.set(record);this.fullName=this.titleCase(record.full_name);this.zipCode=record.zip_code.padStart(5,'0');this.city=this.titleCase(record.city);this.state=record.state;this.result.set(null);this.error.set('');}
  findPoe(){
    this.searching.set(true);this.error.set('');this.result.set(null);
    this.http.post<PoeResponse>('/api/find-poe',{full_name:this.fullName,zip_code:this.zipCode,city:this.city,state:this.state,country:this.country,provider:this.provider,reference_number:this.selected()?.reference_number??null}).subscribe({
      next:data=>{this.result.set(data);this.searching.set(false);},
      error:response=>{this.searching.set(false);this.error.set(response.error?.detail??'The POE request failed. Verify that the scraper API is running on port 8001.');}
    });
  }
  confidence(score:number){return `${Math.round(score*10)}%`;}
  private titleCase(value:string){return value.toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase());}
}
