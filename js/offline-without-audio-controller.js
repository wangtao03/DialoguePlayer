new Vue({
    el: "#app",
    data: {
        status: 'stopped',                  //计时器状态
        duration: 0,                        //计时器时间
        time: "00:00.000",                  //格式化计时器时间
        nextTime: "00:00.000",              //下一条时间
        webSocket: null,                    //webSocket
        isConnected: false,                 //webSocket连接状态
        reconnectInterval: null,            //连接状态检测定时器
        lyricsArray: null,                    //歌词列表
        lastTimestamp: 0,                   //最大执行时间
        activeIndex: 0,                     //标记高亮的行
        containerHeight: 0,                 //歌词容器高
        lineHeight: 0,                      //歌词行高        
    },
    created() {                                                                         //vue创建时建立ws连接
        // 组件创建时导入lyricsArray  
        import('./data.js').then(({ data }) => {
            this.lyricsArray = []
            data.lyricsArray.forEach((lyrics) => {
                let object = { timestamp: this.timeStringToMilliseconds(lyrics.time), time: lyrics.time, role: lyrics.role, content: lyrics.content };
                this.lyricsArray.push(object);
            });
        });

        //自动更新
        setInterval(() => {
            if (this.status == 'running') {
                this.duration += 50;
                this.updateTime();
            }
        }, 50);
    },
    beforeDestroy() {                       //vue销毁时关闭ws连接
    },
    mounted() {
    },
    methods: {
        updateTime() {
            let index = this.findIndex4Duration(this.duration);
            this.activeIndex = index;
            let nextTime = this.lyricsArray[index + 1].timestamp - this.duration;
            this.nextTime = this.formatTimestamp(nextTime);
            this.time = this.formatTimestamp(this.duration);
        },
        formatTimestamp(timestamp) {
            // 直接使用数学运算和模板字符串来格式化时间，避免多次调用toString()  
            const totalSeconds = Math.floor(timestamp / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const milliseconds = ('00' + (timestamp % 1000)).slice(-3); // 更简洁的毫秒格式化  
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
        },
        /** 向服务器发动控制命令 */
        sendCommand(message) {
            switch (message) {
                case 'start':
                    this.duration = 0;
                    this.status = "running"
                    break;
                case 'stop':
                    this.duration = 0;
                    this.status = "stopped"
                    break;
                case 'pause':
                    this.status = "paused"
                    break;
                case 'resume':
                    this.status = "running"
                    break;
                case 'rewind':
                    this.duration -= 500;
                    if (this.duration < 0) this.duration = 0;
                    break;
                case 'forward':
                    this.duration += 500;
                    break;
                case 'reset':
                    this.duration = 0;
                    this.status = "running"
                    break;
            }
            this.updateTime();
        },
        findIndex4Duration(duration) {
            let left = 0;
            let right = this.lyricsArray.length - 1;
            let result = 0; // 如果没有找到符合条件的元素，返回-1或其他合适的默认值  

            while (left <= right) {
                let mid = Math.floor((left + right) / 2);
                // 检查中间元素及其后一个元素（如果存在）  
                if (mid + 1 < this.lyricsArray.length && this.lyricsArray[mid + 1].timestamp < duration) {
                    // 如果mid+1的timestamp小于duration，说明我们可能还没有找到最左边的那个  
                    // 因此我们继续在右半部分搜索  
                    left = mid + 1;
                } else if (this.lyricsArray[mid].timestamp < duration) {
                    // 如果mid的timestamp小于duration，我们可能找到了它，但需要确保它是第一个  
                    // 我们先保存这个索引，然后继续在左半部分搜索，看是否还有更小的  
                    result = mid;
                    right = mid - 1;
                } else {
                    // 如果mid的timestamp不小于duration，我们只在左半部分搜索  
                    right = mid - 1;
                }
            }
            return result;
        },
        timeStringToMilliseconds(timeStr) {
            // 去除时间字符串前后的空白字符  
            timeStr = timeStr.trim();
            // 使用正则表达式分割时间字符串为分钟、秒和毫秒部分  
            const parts = timeStr.match(/(\d{2}):(\d{2})\.(\d{3})/);
            // 检查是否匹配到了预期的格式  
            if (!parts) {
                throw new Error('Invalid time format. Expected "mm:ss.SSS".');
            }
            // 提取分钟、秒和毫秒部分，并转换为整数  
            const minutes = parseInt(parts[1], 10);
            const seconds = parseInt(parts[2], 10);
            const milliseconds = parseInt(parts[3], 10);
            // 计算总毫秒数  
            return (minutes * 60 + seconds) * 1000 + milliseconds;
        },
        activeIndexClass(index) {
            return this.activeIndex === index ? 'active' : '';
        },
    },
    computed: {
        connectClass() {
            return this.isConnected ? 'connected' : 'disconnected';
        },
        transformStyle() {
            try {
                this.containerHeight = this.$el.querySelector('.container').offsetHeight;
                this.lineHeight = this.$el.querySelector('.container li').offsetHeight;

                const activeLiTop = this.activeIndex * this.lineHeight; // 当前激活li的顶部位置  
                const centerY = this.containerHeight / 2; // 容器中心位置  
                const translateY = activeLiTop - centerY + this.lineHeight / 2; // 计算translateY值，使li中心对齐容器中心  

                return {
                    transform: `translateY(${-translateY}px)`,
                };
            } catch (error) {
                return;
            }

        },
    }
})