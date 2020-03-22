import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  XAxis,
  Tooltip,
  CartesianGrid,
  Line,
  YAxis,
} from 'recharts';

class Chart extends React.PureComponent {
  static propTypes = {
    data: PropTypes.array,
  };

  componentDidMount = () => {};

  render() {
    return (
      <div>
        <LineChart
          width={800}
          height={400}
          data={this.props.data}
          margin={{
            top: 5,
            right: 20,
            left: 10,
            bottom: 50,
          }}
        >
          <XAxis
            dataKey="dateString"
            label="Date"
            height={100}
            minTickGap={10}
            padding={{ top: 20 }}
          />
          <YAxis type="number" domain={[0, 'auto']} />
          <Tooltip />
          <CartesianGrid stroke="#f5f5f5" />
          <Line
            type="monotone"
            dataKey="currentlyActiveCases"
            stroke="#739900"
          />
          <Line
            type="monotone"
            dataKey="currentlyHospitalizedCount"
            stroke="#ff00ff"
          />
          <Line
            type="monotone"
            dataKey="predictedNewCaseCount"
            stroke="#ff0000"
          />
          <Line type="monotone" dataKey="newCases" stroke="#00ff00" />
          <Line type="monotone" dataKey="totalDeathCount" stroke="#7300ff" />
          <Line
            type="monotone"
            dataKey="coronaIcuBedCapacity"
            stroke="#7300ff"
          />
        </LineChart>
      </div>
    );
  }
}

export default Chart;
