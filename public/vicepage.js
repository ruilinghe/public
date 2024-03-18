$(document).ready(function (){
    // 初始化设施选择框
    $('#facility-select').select2({
        placeholder: "Select facilities",
        allowClear: true,
        width: '80%',
    });
    
    $('#prediction-facility-select').select2({
        placeholder: "Facility select for prediction",
        allowClear: true,
        width: '80%',
    });

    const defaultday = new Date('2023-12-25').toISOString().slice(0, 10);
    $('#start-date').val(defaultday); 
    $('#end-date').val(defaultday);

    // 更新按钮点击事件
    $('#update-chart').click(function() {
        const selectedFacilities = $('#facility-select').val(); // 获取选中的设施
        const startDate = $('#start-date').val();
        const endDate = $('#end-date').val();
        fetchTrafficData(selectedFacilities, startDate, endDate);
        fetchFacilityData();
        fetchPopularityData();
        updateLastUpdatedTime(startDate, endDate);
    });

    $('#update-prediction-chart').click(function() {
        fetchPredictionData(); 
    });

    initializeFacilitySelect();
    initTrafficChart();
    initPopularityChart();
    initPredictionChart();
    fetchFacilityData();

});

// 函数：初始化设施选择框
function initializeFacilitySelect() {
    // 从服务器获取设施列表
    fetch('/api/facilities') // 假设这是提供设施名称列表的API端点
        .then(response => response.json())
        .then(data => {
            const select = $('#facility-select');
            select.empty(); // 清空现有选项
            const select1 = $('#prediction-facility-select');
            select1.empty(); 
            data.forEach(facility => {
                // 假设每个设施对象包含 name 属性
                select.append(new Option(facility.name, facility.name));
                select1.append(new Option(facility.name, facility.name)); // 假设设施对象包含 name 属性
            });
            if (data.length > 0) {
                select.val(data[0].name); 
                select.trigger('change'); 
                select1.val(data[0].name); 
                select1.trigger('change');
            }
        })
        .catch(error => console.error('Error fetching facilities:', error));
}


let trafficChart;
const colors = [
    'rgba(255, 99, 132, 0.6)',   // 粉红
    'rgba(54, 162, 235, 0.6)',   // 蓝色
    'rgba(255, 206, 86, 0.6)',   // 黄色
    'rgba(75, 192, 192, 0.6)',   // 青色
    'rgba(153, 102, 255, 0.6)',  // 紫色
    'rgba(255, 159, 64, 0.6)',   // 橙色
    'rgba(199, 199, 199, 0.6)',  // 灰色
    'rgba(83, 102, 255, 0.6)',   // 深蓝
    'rgba(255, 99, 71, 0.6)',    // 红色
    'rgba(144, 238, 144, 0.6)',  // 浅绿
];
function initTrafficChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    if (trafficChart) { // 如果图表已存在，先销毁
        trafficChart.destroy();
    }
    // 初始化图表
    trafficChart = new Chart(ctx, {
        type: 'line', // 线图
        data: {
            datasets: [] // 初始化时不设置数据集
        },
        options: {
            scales: {
                x: {type: 'time',
                    time: {
                        unit: 'hour', // 单位设置为小时
                        displayFormats: {
                            hour: 'MMM d HH:mm' // 显示格式
                        },
                        tooltipFormat: 'MMM d HH:mm' // 提示工具格式
                    },
                    ticks: {
                        font: {
                            size: 10 
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Visitors'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 10, // 设置图例文字的大小
                            family: 'Arial', // 设置字体
                        },
                        padding: 5, // 设置图例内边距
                        boxWidth: 15, // 设置图例标记的宽度
                        boxHeight: 15, // 设置图例标记的高度
                    }
                }
            },
            responsive: true, // 图表响应式
            maintainAspectRatio: false // 维持比例
        }
    });
}

function fetchTrafficData(selectedFacilities, startDate, endDate) {
    // 检查设施和日期是否被选择
    if (!selectedFacilities.length || !startDate || !endDate) {
        alert('Please select facilities and specify both start and end dates.');
        return;
    }

    let end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    newDate = end.toISOString().split('T')[0];
    // 构造请求URL
    const url = `/api/raw-data?facilities=${selectedFacilities.join(',')}&startDate=${startDate}&endDate=${newDate}`;

    fetch(url)
    .then(response => response.json())
    .then(data => {
        // 准备图表数据
        const datasets = selectedFacilities.map((facilityName, index) => {
            // 过滤并转换数据
            const facilityData = data.filter(entry => entry.name === facilityName)
                .map(entry => ({
                    x: entry.record_time, 
                    y: entry.visitor 
                }));
            return {
                label: facilityName,
                data: facilityData,
                fill: false,
                borderColor: colors[index % colors.length], // 从已定义的颜色数组中选择颜色
                tension: 0.1 // 设置线条平滑度
            };
        });

        // 更新图表
        trafficChart.data.datasets = datasets;
        trafficChart.update(); // 重新渲染图表以显示新数据
    })
    .catch(error => console.error('Error fetching traffic data:', error));

}

function fetchFacilityData() {
    fetch('/api/fixed-data')
        .then(response => response.json())
        .then(fixedData => {
            // 获取设施运营数据
            const Facilities = fixedData.map(facility => facility.name); 
            const startDate = $('#start-date').val();
            const endDate = $('#end-date').val();
            let end = new Date(endDate);
            end.setDate(end.getDate() + 1); // 结束日期加一天以包含选定的整个日期
            const newDate = end.toISOString().split('T')[0]; // 转换为 YYYY-MM-DD 格式
            console.log(Facilities);
            // 请求实时数据
            fetch(`/api/raw-data?facilities=${Facilities}&startDate=${startDate}&endDate=${newDate}`)
            .then(response => response.json())
            .then(rawData => {
                // 准备更新设施利用率的 HTML
                const utilizationHtml = fixedData.map(facility => {
                    // 计算每个设施的总访客和运营小时数
                    const facilityRawData = rawData.filter(entry => entry.name === facility.name);
                    const totalVisitors = facilityRawData.reduce((sum,record) => sum+Number(record.visitor),0);
                    const operationalHours = facilityRawData.length; // 假设每条记录代表一个小时
                    
                    // 计算利用率
                    const utilizationRate = calculateUtilization(facility, totalVisitors, operationalHours);
                    return `
                        <div class="col-md-4 facility-utilization-item">
                            <p style="font-size:x-small;margin:5px;margin-left:0px;">${facility.name}</p>
                            <p style="font-size:x-small;margin-left:0px;margin-bottom:5px;">Capacity: ${facility.maximum_capacity}, Runtime: ${facility.runtime} min</p>
                            <div class="progress" >
                                <div class="progress-bar" role="progressbar" style="width: ${utilizationRate}%;" aria-valuenow="${utilizationRate}" aria-valuemin="0" aria-valuemax="100">${utilizationRate}%</div>
                            </div>
                        </div>
                    `;
                }).join('');
                document.getElementById('facility-utilization').innerHTML = utilizationHtml;
            })
            .catch(error => console.error('Error fetching raw data:', error));
        })
        .catch(error => console.error('Error fetching fixed data:', error));
}


// 注意：此函数现在需要从外部获取 total_visitors 和 operational_hours
function calculateUtilization(facility, total_visitors, operational_hours) {
    console.log(total_visitors,operational_hours);
    if (operational_hours === 0) return 0; // 防止除以零
    const averageVisitors = total_visitors / operational_hours;
    const maximumCapacity = (60 / facility.runtime) * facility.maximum_capacity;
    const utilizationRate = (averageVisitors / maximumCapacity) * 100;
    return utilizationRate.toFixed(2); // 返回结果，保留两位小数
}

function updateLastUpdatedTime(startDate, endDate) {
    $('#start-time').text(startDate);
    $('#end-time').text(endDate);
}

let popularityChart; // 全局变量以便可以在其他函数中引用图表

function initPopularityChart() {
    const ctx = document.getElementById('popularityChart').getContext('2d');
    if (popularityChart) { // 如果图表已存在，先销毁
        popularityChart.destroy();
    }
    // 初始化图表
    popularityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], // 初始时标签为空
            datasets: [{
                label: 'Average Visitors',
                data: [], // 初始时数据为空
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // 蓝色
            }]
        },
        options: {
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average Visitors'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // 如果不需要图例，可以设置为 false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Avg Visitors: ${context.parsed.y}`;
                        }
                    }
                }
            },
            maintainAspectRatio: false, // 维持比例
            plugins: {
                // 使用内部插件来显示顶部标签
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    color: '#007bff',
                    formatter: function(value, context) {
                        return value.y; // 修改此处以适应您的数据结构
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // 确保引入了ChartDataLabels插件
    });
}

function fetchPopularityData() {
    fetch('/api/fixed-data')
        .then(response => response.json())
        .then(fixedData => {
            const Facilities = fixedData.map(facility => facility.name); 
            const startDate = $('#start-date').val();
            const endDate = $('#end-date').val();
            let end = new Date(endDate);
            end.setDate(end.getDate() + 1); 
            const newDate = end.toISOString().split('T')[0];
            
            fetch(`/api/raw-data?facilities=${Facilities.join(',')}&startDate=${startDate}&endDate=${newDate}`)
            .then(response => response.json())
            .then(rawData => {
                const facilityData = fixedData.map(facility => {
                    const facilityRawData = rawData.filter(entry => entry.name === facility.name);
                    const totalVisitors = facilityRawData.reduce((sum, record) => sum + Number(record.visitor), 0);
                    const operationalHours = Math.max(facilityRawData.length, 1); // Avoid division by zero
                    const avgVisitor = totalVisitors / operationalHours;
                    return { name: facility.name, avgVisitor: avgVisitor.toFixed(2) };
                });

                // Sort by avgVisitor in descending order
                facilityData.sort((a, b) => b.avgVisitor - a.avgVisitor);

                // Split the sorted data into labels and data arrays
                const labels = facilityData.map(item => item.name);
                const visitorsData = facilityData.map(item => item.avgVisitor);

                // Update chart data
                popularityChart.data.labels = labels;
                popularityChart.data.datasets[0].data = visitorsData;
                popularityChart.update();
            })
            .catch(error => console.error('Error fetching raw data:', error));
        })
        .catch(error => console.error('Error fetching fixed data:', error));
}

let predictionChart;
function initPredictionChart() {
    const ctx = document.getElementById('predictionChart').getContext('2d');
    if (predictionChart) { // 如果图表已存在，先销毁
        predictionChart.destroy();
    }
    predictionChart = new Chart(ctx, {
        type: 'line', // 线图用于展示时间序列数据
        data: {
            labels: [], // 初始时标签为空
            datasets: [] // 初始时数据集为空
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour', // 设定时间单位为小时
                        // 修改或添加如下行来设定横轴时间的显示格式
                        displayFormats: {
                            hour: 'MMM dd HH:mm' // 显示格式为月 日 小时:分钟
                        },
                        tooltipFormat: 'MMM dd, HH:mm' // 鼠标悬停提示信息的时间格式
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Visitors'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true // 显示图例
                }
            },
            maintainAspectRatio: false // 不保持纵横比
        }
    });
}


function fetchPredictionData() {
    const selectedFacility = $('#prediction-facility-select').val();
    const startDate = '2023-12-25'; // 设置为您的实际数据日期
    const endDate = '2023-12-30';
    const startpreDate = '2023-12-29'; // 设置为您的预测日期
    const endpreDate = '2023-12-31';
    // 确保选定了设施
    if (!selectedFacility) {
        alert('Please select facilities.');
        return;
    }

    // 获取并整合实际数据和预测数据
    fetch(`/api/raw-data?facilities=${selectedFacility}&startDate=${startDate}&endDate=${endDate}`)
        .then(response => response.json())
        .then(actualData => {
            fetch(`/api/predict-data?facilities=${selectedFacility}&startDate=${startpreDate}&endDate=${endpreDate}`)
                .then(response => response.json())
                .then(predictedData => {
                    // 合并实际数据和预测数据的时间标签
                    const allDates = [...new Set([...actualData.map(item => item.record_time), ...predictedData.map(item => item.record_time)])].sort();
                    // 转换时间标签为 Date 对象并排序
                    const labels = allDates.map(date => new Date(date));

                    // 创建实际数据系列
                    const actualDataSeries = labels.map(label => {
                        const matchingItem = actualData.find(item => item.record_time === label.toISOString().split('T')[0] + 'T' + label.toISOString().split('T')[1]);
                        return matchingItem ? matchingItem.visitor : null;
                    });
                    
                    const predictedDataSeries = labels.map(label => {
                        const matchingItem = predictedData.find(item => item.record_time === label.toISOString().split('T')[0] + 'T' + label.toISOString().split('T')[1]);
                        return matchingItem ? matchingItem.visitor : null;
                    });
                    console.log(actualData);
                    console.log(predictedData);
                    console.log(predictedDataSeries);
                    predictionChart.data.labels = labels;
                    predictionChart.data.datasets = [
                        {
                            label: 'Actual Traffic',
                            data: actualDataSeries,
                            borderColor: 'rgba(54, 162, 235, 0.6)', // 蓝色
                            fill: false
                        },
                        {
                            label: 'Predicted Traffic',
                            data: predictedDataSeries,
                            borderColor: 'rgba(255, 99, 132, 0.6)', // 红色
                            fill: false
                        }
                    ];
                    predictionChart.update();
                })
                .catch(error => console.error('Error fetching predicted data:', error));
        })
        .catch(error => console.error('Error fetching actual data:', error));
}

