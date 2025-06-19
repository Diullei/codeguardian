import { ValidationReporter, ValidationReport } from './types';

export class JsonReporter implements ValidationReporter {
    report(report: ValidationReport): void {
        console.log(JSON.stringify(report, null, 2));
    }
}
