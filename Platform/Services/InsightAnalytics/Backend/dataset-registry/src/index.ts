import { Injectable } from '@nestjs/common';

export interface Dataset {
  id: string;
  owner: string;
  freshness: string;
}

@Injectable()
export class DatasetRegistryService {
  private datasets: Dataset[] = [
    { id: 'sales.daily', owner: 'finops', freshness: '5m' },
    { id: 'marketing.leads', owner: 'growth', freshness: '15m' },
  ];

  list(): Dataset[] {
    return this.datasets;
  }

  register(dataset: Dataset): Dataset {
    this.datasets.push(dataset);
    return dataset;
  }
}
