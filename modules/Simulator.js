import moment from 'moment';
import {
  getRegionKey,
  getDateColumnString,
  getDateArray,
  csvToArray,
  getDaysBackRange,
} from '../utils/utils';

class Simulator {
  structuredRegionData = {};

  initialize = async () => {
    await this.loadRawData();
    await this.structureRawData();
  };

  loadRawData = () => {
    const request = new XMLHttpRequest();
    const confirmedCaseDataUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv';
    request.open('GET', confirmedCaseDataUrl, false);
    request.send(null);
    this.rawConfirmedCaseData = csvToArray(request.responseText);

    const deathRequest = new XMLHttpRequest();
    const deathDataUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv';
    deathRequest.open('GET', deathDataUrl, false);
    deathRequest.send(null);
    this.rawDeathData = csvToArray(deathRequest.responseText);

    const recoveredRequest = new XMLHttpRequest();
    const recoveredDataUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv';
    recoveredRequest.open('GET', recoveredDataUrl, false);
    recoveredRequest.send(null);
    this.rawRecoveredData = csvToArray(recoveredRequest.responseText);
  };

  mergeInNewDataSeries = (regionKey, fieldName, dataToMerge) => {
    const existingData = this.structuredRegionData[regionKey].data;
    const newData = [];
    existingData.forEach((dataRow) => {
      const { date } = dataRow;
      const newDataRow = {
        ...dataRow,
      };
      newDataRow[fieldName] = dataToMerge[date] || null;
      newData.push(newDataRow);
    });
    this.structuredRegionData[regionKey].data = newData;
  };

  structureRawData = () => {
    // When the data starts
    const initialDate = new Date(2020, 0, 22);
    const todaysDate = new Date();
    // One year from today
    const endDate = new Date(
      todaysDate.getFullYear() + 3,
      todaysDate.getMonth(),
      todaysDate.getDate(),
    );
    const dateRange = getDateArray(initialDate, endDate);

    const headers = this.rawConfirmedCaseData[0];
    const stateIndex = headers.indexOf('Province/State');
    const countryIndex = headers.indexOf('Country/Region');

    // Add all regions
    this.rawConfirmedCaseData.slice(1).forEach((row) => {
      const state = row[stateIndex];
      const country = row[countryIndex];
      const dateData = dateRange.map(dateObj => ({
        dateString: moment(dateObj).format('MMMM, Do YYYY'),
        date: dateObj,
      }));
      this.structuredRegionData[getRegionKey(state, country)] = {
        state,
        country,
        data: dateData,
      };
    });
    // Add confirmed cases
    this.rawConfirmedCaseData.slice(1).forEach((row) => {
      const state = row[stateIndex];
      const country = row[countryIndex];
      const regionKey = getRegionKey(state, country);
      const fieldName = 'confirmedCaseCount';
      const data = {};

      dateRange.forEach((date) => {
        const dateIndex = headers.indexOf(getDateColumnString(date));
        if (dateIndex !== -1) {
          data[date] = row[dateIndex];
        }
      });

      this.mergeInNewDataSeries(regionKey, fieldName, data);
    });

    // Add death counts
    const deathHeaders = this.rawDeathData[0];
    const deathStateIndex = deathHeaders.indexOf('Province/State');
    const deathCountryIndex = deathHeaders.indexOf('Country/Region');

    this.rawDeathData.slice(1).forEach((row) => {
      const state = row[deathStateIndex];
      const country = row[deathCountryIndex];
      const regionKey = getRegionKey(state, country);
      const fieldName = 'deathCount';
      const data = {};

      dateRange.forEach((date) => {
        const dateIndex = headers.indexOf(getDateColumnString(date));
        if (dateIndex !== -1) {
          data[date] = row[dateIndex];
        }
      });

      this.mergeInNewDataSeries(regionKey, fieldName, data);
    });

    // Add recovered counts
    const recoveredHeaders = this.rawRecoveredData[0];
    const recoveredStateIndex = recoveredHeaders.indexOf('Province/State');
    const recoveredCountryIndex = recoveredHeaders.indexOf('Country/Region');

    this.rawRecoveredData.slice(1).forEach((row) => {
      const state = row[recoveredStateIndex];
      const country = row[recoveredCountryIndex];
      const regionKey = getRegionKey(state, country);
      const fieldName = 'confirmedRecoveredCount';
      const data = {};

      dateRange.forEach((date) => {
        const dateIndex = headers.indexOf(getDateColumnString(date));
        if (dateIndex !== -1) {
          data[date] = row[dateIndex];
        }
      });

      this.mergeInNewDataSeries(regionKey, fieldName, data);
    });
  };

  simulationEvents = [
    {
      date: new Date(2020, 0, 1),
      newValues: {
        population: 4000000,
        percentCasesConfirmed: 0.2,
        effectiveR0: 1,
        hospitalizationRate: 0.073,
        hospitalizationRecoveryDays: 14,
        daysFromInfectionToHospitalization: 7,
        icuCareAvailableFatalityRate: 0.011,
        icuCareNotAvailableFatalityRate: 0.073,
        daysFromInfectionToDeath: 33,
        icuBedCount: 5000,
        icuBedsRequiredForOtherIssues: 400,
        incubationPeriodDays: 5,
        contagiousPeriodDays: 4,
      },
      name: 'Initial Values',
    },
    {
      date: new Date(2020, 2, 27),
      newValues: { effectiveR0: 1.2 },
      name: 'New Treatment',
    },
  ];

  sortObjByDate = (a, b) => {
    if (a.date > b.date) return 1;
    if (b.date > a.date) return -1;
    return 0;
  };

  getSimulationVariablesForDate = (date) => {
    let simulationVariables = {};
    const sortedSimulationEvents = this.simulationEvents.sort(
      this.sortObjByDate,
    );
    sortedSimulationEvents.forEach((event) => {
      if (date >= event.date) {
        simulationVariables = {
          ...simulationVariables,
          ...event.newValues,
        };
      }
    });
    return simulationVariables;
  };

  // Takes the existing confirmed cases and estimates the actual numbers
  // This assumes not everyone who gets the virus is infected
  getEstimatedTotalCaseCount = (currentPoint, currentDateSimulationVariables) => (currentPoint.confirmedCaseCount
    ? currentPoint.confirmedCaseCount
        / currentDateSimulationVariables.percentCasesConfirmed
    : null);

  // Relies only on information from previous days
  getPredictedNewCaseCount = (
    updatedPointList,
    currentIndex,
    currentDateSimulationVariables,
  ) => {
    // Look at the previous days (set back by the incubation period)
    const startDaysBack = currentDateSimulationVariables.contagiousPeriodDays
      + currentDateSimulationVariables.incubationPeriodDays;
    const endDaysBack = currentDateSimulationVariables.incubationPeriodDays;
    const daysThatImpactTodaysContagiousCount = getDaysBackRange(
      updatedPointList,
      currentIndex,
      startDaysBack,
      endDaysBack,
    );
    const newCaseCount = daysThatImpactTodaysContagiousCount.reduce(
      (predictedNewCaseTotal, pastDay) => {
        const simulationVariablesForPastDay = this.getSimulationVariablesForDate(
          pastDay.date,
        );
        // If we are dealing with estimated data, then use the estimate contagious count
        // From the estimated active cases.
        const contagiousCases = pastDay.estimatedNewCases || pastDay.predictedNewCaseCount;

        return (
          predictedNewCaseTotal
          + (contagiousCases
            * (simulationVariablesForPastDay.effectiveR0
              * pastDay.susceptiblePercentage))
            / simulationVariablesForPastDay.contagiousPeriodDays
        );
      },
      0,
    );
    return newCaseCount;
  };

  // Relies only on information from previous days
  getNewDeathCount = (
    updatedPointList,
    currentIndex,
    currentDateSimulationVariables,
  ) => {
    if (currentIndex === 0) {
      return 0;
    }
    // Look at the previous days (set back by the incubation period)
    const infectedDateOfThoseDyingToday = updatedPointList[
      Math.max(
        currentIndex
            - currentDateSimulationVariables.daysFromInfectionToDeath,
        0,
      )
    ];
    const hospitalizationDateOfThoseDyingToday = updatedPointList[
      Math.max(
        currentIndex
            - currentDateSimulationVariables.daysFromInfectionToDeath
            + currentDateSimulationVariables.daysFromInfectionToHospitalization,
        0,
      )
    ];

    const newCases = infectedDateOfThoseDyingToday.estimatedNewCases
      || infectedDateOfThoseDyingToday.predictedNewCaseCount;

    const hospitalizedCount = newCases
      * this.getSimulationVariablesForDate(infectedDateOfThoseDyingToday.date)
        .hospitalizationRate;

    const hospitalizationDateVariables = this.getSimulationVariablesForDate(
      hospitalizationDateOfThoseDyingToday.date,
    );

    const icuBedsAvailableDayOfHospitalization = Math.min(
      0,
      hospitalizationDateVariables.icuBedCount
        - hospitalizationDateVariables.icuBedsRequiredForOtherIssues
        - hospitalizationDateOfThoseDyingToday.currentlyHospitalizedCount,
    );

    const countWithICUSupport = Math.min(
      hospitalizedCount,
      icuBedsAvailableDayOfHospitalization,
    );

    const countWithNoICUSupport = Math.max(
      hospitalizedCount - countWithICUSupport,
      0,
    );

    return (
      countWithICUSupport
        * currentDateSimulationVariables.icuCareAvailableFatalityRate
      + countWithNoICUSupport
        * currentDateSimulationVariables.icuCareNotAvailableFatalityRate
    );
  };

  // Relies only on information from previous days
  getCurrentlyHospitalizedCount = (
    updatedPointList,
    currentIndex,
    currentDateSimulationVariables,
  ) => {
    // Look at the previous days (set back by the incubation period)
    const startDaysBack = currentDateSimulationVariables.hospitalizationRecoveryDays
      + currentDateSimulationVariables.daysFromInfectionToHospitalization;

    const endDaysBack = currentDateSimulationVariables.daysFromInfectionToHospitalization;

    const daysThatImpactTodaysHospitalizedCount = getDaysBackRange(
      updatedPointList,
      currentIndex,
      startDaysBack,
      endDaysBack,
    );

    const hospitalizedCount = daysThatImpactTodaysHospitalizedCount.reduce(
      (hospitalizedCountTotal, pastDay) => {
        const simulationVariablesForPastDay = this.getSimulationVariablesForDate(
          pastDay.date,
        );

        const newCases = pastDay.estimatedNewCases || pastDay.predictedNewCaseCount;

        return (
          hospitalizedCountTotal
          + newCases * simulationVariablesForPastDay.hospitalizationRate
        );
      },
      0,
    );

    return hospitalizedCount;
  };

  // Relies only on information from previous days
  getCurrentlyActiveCases = (
    updatedPointList,
    currentIndex,
    currentDateSimulationVariables,
  ) => {
    // Look at the previous days (set back by the incubation period)
    const startDaysBack = currentDateSimulationVariables.incubationPeriodDays
      + currentDateSimulationVariables.contagiousPeriodDays;

    const endDaysBack = 0;

    const daysThatImpactTodaysHospitalizedCount = getDaysBackRange(
      updatedPointList,
      currentIndex,
      startDaysBack,
      endDaysBack,
    );

    const currentlyActiveCases = daysThatImpactTodaysHospitalizedCount.reduce(
      (activeCases, pastDay) => {
        const newCases = pastDay.estimatedNewCases || pastDay.predictedNewCaseCount;

        return activeCases + newCases;
      },
      0,
    );

    return currentlyActiveCases;
  };

  runSimulation = async (regionKey) => {
    const pointList = this.getData(regionKey);

    const updatedPointList = [];

    pointList.forEach((currentPoint, index) => {
      const currentDateSimulationVariables = this.getSimulationVariablesForDate(
        currentPoint.date,
      );
      const prevObject = index === 0 ? {} : updatedPointList[index - 1];
      const updatedPoint = {
        ...currentPoint,
      };
      updatedPoint.estimatedTotalCaseCount = this.getEstimatedTotalCaseCount(
        currentPoint,
        currentDateSimulationVariables,
      );
      updatedPoint.estimatedNewCases = Math.max(
        updatedPoint.estimatedTotalCaseCount
          ? updatedPoint.estimatedTotalCaseCount
              - prevObject.estimatedTotalCaseCount
          : null,
        0,
      );
      updatedPoint.predictedNewCaseCount = this.getPredictedNewCaseCount(
        updatedPointList,
        index,
        currentDateSimulationVariables,
      );

      const previousCount = prevObject.estimatedTotalCaseCount || prevObject.predictedCaseCount;
      updatedPoint.predictedCaseCount = updatedPoint.predictedNewCaseCount + previousCount;

      updatedPoint.susceptibleCount = Math.max(
        0,
        currentDateSimulationVariables.population
          - (updatedPoint.estimatedTotalCaseCount
            || updatedPoint.predictedCaseCount),
      );

      updatedPoint.susceptiblePercentage = updatedPoint.susceptibleCount
        / currentDateSimulationVariables.population;

      updatedPoint.currentlyHospitalizedCount = this.getCurrentlyHospitalizedCount(
        updatedPointList,
        index,
        currentDateSimulationVariables,
      );
      updatedPoint.coronaIcuBedCapacity = currentDateSimulationVariables.icuBedCount
        - currentDateSimulationVariables.icuBedsRequiredForOtherIssues;

      updatedPoint.currentlyActiveCases = this.getCurrentlyActiveCases(
        updatedPointList,
        index,
        currentDateSimulationVariables,
      );

      updatedPoint.newDeathCount = this.getNewDeathCount(
        updatedPointList,
        index,
        currentDateSimulationVariables,
      );

      updatedPoint.totalDeathCount = (prevObject.totalDeathCount || 0) + updatedPoint.newDeathCount;

      updatedPointList.push(updatedPoint);
    });
    this.structuredRegionData[regionKey].data = updatedPointList;
  };

  getData = regionKey => this.structuredRegionData[regionKey].data;
}

const simulator = new Simulator();

export default simulator;
