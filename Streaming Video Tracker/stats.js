(function() {
  // React と ReactDOM が利用可能になるまで待機
  function waitForReact(callback) {
    if (window.React && window.ReactDOM && window.Recharts) {
      callback();
    } else {
      setTimeout(() => waitForReact(callback), 50);
    }
  }

  waitForReact(() => {
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const Recharts = window.Recharts;

    const { useState, useEffect } = React;
    const { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    const Stats = () => {
      const [stats, setStats] = useState(null);

      useEffect(() => {
        chrome.storage.local.get('videos', (data) => {
          const videos = data.videos || [];
          const genreCounts = videos.reduce((acc, video) => {
            if (video.genre) {
              acc[video.genre] = (acc[video.genre] || 0) + 1;
            }
            return acc;
          }, {});

          const serviceWatchTime = videos.reduce((acc, video) => {
            if (video.service && video.watchedDuration) {
              acc[video.service] = (acc[video.service] || 0) + video.watchedDuration;
            }
            return acc;
          }, {});

          const totalWatchTime = videos.reduce((sum, video) => sum + (video.watchedDuration || 0), 0);
          const completedCount = videos.filter(v => v.status === 'completed').length;
          const averageRating = videos.reduce((sum, video) => sum + (video.rating || 0), 0) / videos.filter(v => v.rating).length;

          setStats({
            genreCounts,
            serviceWatchTime,
            totalWatchTime,
            completedCount,
            averageRating,
            totalVideos: videos.length,
          });
        });
      }, []);

      if (!stats) return React.createElement('div', null, 'Loading...');

      const genreData = Object.entries(stats.genreCounts).map(([name, value]) => ({ name, value }));
      const serviceData = Object.entries(stats.serviceWatchTime).map(([name, value]) => ({ name, value: Math.round(value / 3600) }));

      return React.createElement(
        'div',
        { className: 'space-y-8' },
        React.createElement('h1', { className: 'text-3xl font-bold text-center my-4' }, '視聴統計'),
        React.createElement(
          'div',
          { className: 'bg-white p-4 rounded shadow' },
          React.createElement('h2', { className: 'text-xl font-semibold mb-2' }, '総合統計'),
          React.createElement('p', null, `総視聴時間: ${Math.round(stats.totalWatchTime / 3600)} 時間`),
          React.createElement('p', null, `視聴完了作品数: ${stats.completedCount}`),
          React.createElement('p', null, `平均評価: ${stats.averageRating.toFixed(1)} / 5`),
          React.createElement('p', null, `総視聴作品数: ${stats.totalVideos}`)
        ),
        React.createElement(
          'div',
          { className: 'bg-white p-4 rounded shadow' },
          React.createElement('h2', { className: 'text-xl font-semibold mb-2' }, 'ジャンル別視聴割合'),
          React.createElement(
            ResponsiveContainer,
            { width: '100%', height: 300 },
            React.createElement(
              PieChart,
              null,
              React.createElement(
                Pie,
                {
                  data: genreData,
                  dataKey: 'value',
                  nameKey: 'name',
                  cx: '50%',
                  cy: '50%',
                  outerRadius: 100,
                  fill: '#8884d8',
                  label: true
                },
                genreData.map((entry, index) => 
                  React.createElement(Cell, { key: `cell-${index}`, fill: COLORS[index % COLORS.length] })
                )
              ),
              React.createElement(Tooltip),
              React.createElement(Legend)
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'bg-white p-4 rounded shadow' },
          React.createElement('h2', { className: 'text-xl font-semibold mb-2' }, 'サービス別視聴時間 (時間)'),
          React.createElement(
            ResponsiveContainer,
            { width: '100%', height: 300 },
            React.createElement(
              BarChart,
              { data: serviceData },
              React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
              React.createElement(XAxis, { dataKey: 'name' }),
              React.createElement(YAxis),
              React.createElement(Tooltip),
              React.createElement(Legend),
              React.createElement(Bar, { dataKey: 'value', fill: '#8884d8' })
            )
          )
        )
      );
    };

    ReactDOM.render(React.createElement(Stats), document.getElementById('root'));
  });
})();