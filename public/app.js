$(document).ready(function() {
    
    function refreshData() {
        fetchFacilities();
        fetchTrafficData();
        fetchLogs();
        updateLastUpdatedTime();
        fetchFacilityStatuses();
    }

    $('#facility-select-status').select2({
        width: 150
    });  // 初始化下拉单选框
    
    
    // 初始化设施选择下拉菜单为Select2
    $('#facility-select').select2({
        placeholder: "Select facilities",
        allowClear: true,
        width: '80%',
    });

    $('#update-chart').click(function() {
        const selectedFacilities = $('#facility-select').val(); 
        if(!selectedFacilities.length){
            alert('Please select facilities.');
            return;
        }
        initTrafficChart(); // 重新初始化图表
        fetchTrafficData(); // 获取并显示选中的设施的最新数据
    });

    $('#send-comment').click(() => {
        const facility = $('#facility-select-comment').val();
        const description = $('#comment-input').val();
        if(!description.trim()){
            alert('The comment can\'t be blank.');
            return;
        }
        addWorkingLog(facility, 'comment', description);
        $('#comment-input').val('');  // 清空评论框
    });

    $(document).ready(function() {
        initializeAffairsComment();
    });
    
    initializeFacilities();
    initTrafficChart();
    initChartSelect(); //画图选择框
    initStatusButtons();  // 初始化状态按钮
    initFacilitySelect(); //设施选择按钮
    initializeAffairsComment();
    
    refreshData();
    setInterval(refreshData, 1000);
    
});


function formatDate(date) {
    const pad = (number) => (number < 10 ? '0' + number : number);

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);  // 月份从0开始，所以+1
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);

    // 等待动画完成后移除 toast
    setTimeout(() => {
        toast.remove();
    }, 5000); // 5秒后移除，确保与CSS动画时长一致
}


function initializeFacilities() {
    fetch('/api/fixed-data')
        .then(response => response.json())
        .then(data => {
            const container = $('#facilities-container');
            container.empty(); 
            data.forEach(facility => {
                container.append(`
                    <div class="col-md-2 facility-card-container" data-facility="${facility.name}">
                        <div class="facility-card normal">
                            <p style="font-size:small; font-weight:bold;margin-bottom:5px;">${facility.name}</p>
                            <p style="font-size:x-small; margin:0;">Capacity: ${facility.maximum_capacity}</p>
                            <p style="font-size:x-small; margin-bottom:5px;">Runtime: ${facility.runtime}</p>
                            <p class="wait-people" style="font-size:x-small; font-weight:bold; margin:0;">Queue: ...</p>
                            <p class="wait-time" style="font-size:x-small; font-weight:bold;">Wait time: ...</p>
                        </div>
                    </div>
                `);
            });
        })
        .catch(error => console.error('Error fetching fixed data:', error));
}

// Function to fetch facilities data and display them
function fetchFacilities() {
    fetch('/api/facilities')
        .then(response => response.json())
        .then(data => {
            data.forEach(facility => {
                const facilityContainer = $(`.facility-card-container[data-facility="${facility.name}"]`);
                const isBreakdown = facilityContainer.data('isBreakdown');
                
                // Only update the class if not in breakdown mode
                if (!isBreakdown) {
                    const cardClass = facility.wait_time > 40 ? 'crowded' : 'normal';
                    facilityContainer.find('.facility-card').attr('class', `facility-card ${cardClass}`);
                    facilityContainer.find('.wait-people').text(`Queue: ${facility.current_queue}`);
                    facilityContainer.find('.wait-time').text(`Wait time: ${facility.wait_time}`);
                }
                // If it's breakdown, ensure the class is set correctly but do not update data
                else {
                    facilityContainer.find('.facility-card').attr('class', 'facility-card breakdown');
                    facilityContainer.find('.wait-people').text(`Queue: ...`);
                    facilityContainer.find('.wait-time').text(`Wait time: ...`);
                }
            });
        })
        .catch(error => console.error('Error fetching facilities:', error));
}


function fetchFacilityStatuses() {
    fetch('/api/facility-status')
        .then(response => response.json())
        .then(data => {
            data.forEach(facility => {
                const facilityContainer = $(`.facility-card-container[data-facility="${facility.name}"]`);
                const isBreakdown = facility.status.toLowerCase() === 'breakdown';
                // facilityContainer.toggleClass('breakdown', isBreakdown);
                facilityContainer.data('isBreakdown', isBreakdown);  // Store breakdown status
            });
        })
        .catch(error => console.error('Error fetching facility statuses:', error));
}


// Function to fetch working logs and display them
function fetchLogs() {
    fetch('/api/logs')
        .then(response => response.json())
        .then(data => {
            const container = $('#working-log-container');
            container.empty(); // Clear existing content
            data.forEach(log => {
                // Determine log class based on log type
                let logClass = '';
                switch (log.log_type) {
                    case 'Reply':
                        logClass = 'log-reply';
                        break;
                    case 'Fault':
                        logClass = 'log-fault';
                        break;
                    case 'Warning':
                        logClass = 'log-warning';
                        break;
                    default:
                        logClass = ''; // No additional class for unknown types
                }
                const updateTime = formatDate(new Date(log.timestamp));
                container.append(`
                    <div class="log-entry ${logClass}">
                        <strong style="font-weight:normal; color:gray; font-size:x-small">${updateTime}</strong> -
                        <span class="log-facility">${log.facility}</span>: ${log.message}
                    </div>
                `);
            });
        })
        .catch(error => console.error('Error fetching logs:', error));
}


// Function to update last updated time
function updateLastUpdatedTime() {
    const now = new Date();
    const formattedTime = formatDate(now); // Format time as YYYY-MM-DD HH:MM:SS
    $('#update-time').text(formattedTime);
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

function initChartSelect() {
    fetch('/api/fixed-data')
        .then(response => response.json())
        .then(data => {
            const select = $('#facility-select');
            select.empty(); // 清空现有的选项
            data.forEach(facility => {
                select.append(new Option(facility.name, facility.name));
            });
            if (data.length > 0) {
            select.val(data[0].name); 
            select.trigger('change'); 
        }
        })
        .catch(error => console.error('Error fetching facility data:', error));
}
  

function initTrafficChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    if (trafficChart) { // 如果图表已存在，先销毁
        trafficChart.destroy();
    };
    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // 时间标签，稍后填充
            datasets: [] // 数据集将基于选择动态添加
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        display:{
                            second: 'HH:mm:ss'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Current Queue'
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
            }
        }
    });
}

function fetchTrafficData() {   
    const selectedFacilities = $('#facility-select').val(); 
    fetch('/api/facilities')
        .then(response => response.json())
        .then(data => {
            console.log(selectedFacilities);
            console.log(data);
            const filteredData = data.filter(facility => selectedFacilities.includes(facility.name)); // 过滤出选中的设施
            const updateTime = data.length ? new Date(data[0].record_time) : new Date();
            // console.log(updateTime);
            // 清空现有数据
            trafficChart.data.labels = [];
            trafficChart.data.labels.push(updateTime);
            console.log(trafficChart.data.labels);
            filteredData.forEach((facility, index) => {
                // 检查是否存在对应的数据集，如果不存在则创建
                if (index >= trafficChart.data.datasets.length) {
                    // 创建新的数据集
                    trafficChart.data.datasets.push({
                        label: facility.name, // 使用设施名称作为数据集标签
                        data: [], // 初始化数据数组
                        fill: false,
                        borderColor: colors[index % colors.length], // 从配色方案中选择颜色
                        backgroundColor: colors[index % colors.length], // 设置背景颜色（用于点和区域）
                        tension: 0.1
                    });
                }

                // 将最新的队列数据添加到相应的数据集
                trafficChart.data.datasets[index].data.push({
                    x: updateTime, // 使用UTC时间
                    y: facility.current_queue
                });
            });

            trafficChart.update(); // 更新图表
        })
        .catch(error => console.error('Error fetching traffic data:', error));
}


function initStatusButtons() {
    // 给每个状态按钮添加点击事件
    $('.status-btn').click(function() {
        // 移除所有按钮的激活状态
        $('.status-btn').removeClass('active');
        // 激活点击的按钮
        $(this).addClass('active');
    });

    // 确认按钮的点击事件
    $('#confirm-status').click(function() {
        // 获取选择的设施和状态
        const facility = $('#facility-select-status').val();
        const status = $('.status-btn.active').data('status');
        if(!status){
            alert('Please select a status for this facility.');
            return;
        }
        // 发送状态更新请求到服务器
        updateFacilityStatus(facility, status);
    });
}

function updateFacilityStatus(facility, status) {
    fetch(`/api/facility-status/${facility}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: status })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Status updated successfully', data);
        // 在状态更新成功后发送工作日志
        addWorkingLog(facility, status);
        // 显示更新结果的toast
        showToast(`Status updated to ${status}`);
    })
    .catch((error) => {
        console.error('Error updating status:', error);
        // 显示错误的toast
        showToast('Error updating status');
    });
}

function addWorkingLog( facility, status, description = '') {
    // 假设日志信息根据状态生成
    let log_type = '';
    let logMessage ='';
    switch (status) {
        case 'comment':
            log_type = 'Reply';
            logMessage = description;
            break;
        case 'Normal':
            log_type = 'Reply';
            logMessage = 'This facility is back to normal.'
            break;
        case 'Crowded':
            log_type = 'Warning';
            logMessage = 'This facility is crowded. Please guide visitors to go to other facilities first.'
            break;
        case 'Breakdown':
            log_type = 'Fault';
            logMessage = 'This facilty is breadown, need repair.'
            break;
        default:
            log_type = '';
            logMessage = '';
    }
    if(logMessage != ''){
        fetch('/api/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                facility: facility,
                log_type: log_type,
                message: logMessage
            })
        })
        .then(response => {
            if(response.ok) {
                console.log('Working log added successfully');
            } else {
                throw new Error('Failed to add working log');
            }
        })
        .catch((error) => {
            console.error('Error adding working log:', error);
        });
    }
    
}


function initFacilitySelect() {
    fetch('/api/facilities')  // 假设这是你的API端点来获取设施列表
        .then(response => response.json())
        .then(data => {
            const select = $('#facility-select-status');
            select.empty(); // 清空现有的选项
            data.forEach(facility => {
                select.append(new Option(facility.name, facility.id)); // 假设每个设施都有 id 和 name
            });
            select.select2({ width: '150px' }); // 重新初始化select2
        })
        .catch(error => console.error('Error fetching facility data:', error));
}

function initializeAffairsComment() {
    fetch('/api/fixed-data')  // 假设这是获取设施列表的API端点
        .then(response => response.json())
        .then(data => {
            const select = $('#facility-select-comment');
            select.empty();  // 清空现有的选项
            data.forEach(facility => {
                select.append(new Option(facility.name, facility.name)); // 假设每个设施都有一个名字
            });
            select.select2({ width: '150px' }); // 重新初始化select2
        })
        .catch(error => console.error('Error fetching facilities:', error));
}