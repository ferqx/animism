(function (global, factory) {

    if (typeof module === "object" && typeof module.exports === "object") {

        module.exports = global.document ? factory(global, true) : function (w) {
            if (!w.document) {
                throw new Error("Animism requires a window with a document");
            }
            return factory(w);
        };
    } else {
        factory(global);
    }

    //如果window存在 便使用 window,否则使用this => window
}(typeof window !== "undefined" ? window : this, function (window, noGlobal) {
    //思路
    //1 导入图片，进行解析
    //2 开始解析，数据分离,
    //3 开启模式，不同模式所需数据
    //4 功能调用
    //5 完成，导出图片

    // "use strict";

    //图片格式正则检测  jpeg jpg png 
    var rtype = /^(?:image\/jpeg|image\/jpg|image\/png|)$/i;
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    /**
     * 
     * 
     * @param {any} selector        //传入选择器
     * @returns     //利用工厂模式，每次调用都实例化animism.fn.init
     */
    var animism = function (selector) {
        return new animism.fn.init(selector);
    };


    //原型
    animism.fn = animism.prototype = {

        constructor: animism,

    };

    var reducible = [];
    var leafNum = 0;

    // refer to http://www.twinklingstar.cn/2013/491/octree-quantization/

    // 八叉树节点
    var OctreeNode = function () {
        this.isLeaf = false;
        this.pixelCount = 0;
        this.red = 0;
        this.green = 0;
        this.blue = 0;

        this.children = new Array(8);
        for (var i = 0; i < this.children.length; i++) this.children[i] = null;

        // 这里的 next 不是指兄弟链中的 next 指针
        // 而是在 reducible 链表中的下一个节点
        this.next = null;
    };

    for (var i = 0; i < 7; i++) reducible.push(null);

    var root = new OctreeNode();

    /**
     * createNode
     *
     * @param {OctreeNode} parent the parent node of the new node
     * @param {Number} idx child index in parent of this node
     * @param {Number} level node level
     * @return {OctreeNode} the new node
     */
    function createNode(parent, idx, level) {
        var node = new OctreeNode();
        if (level === 7) {
            node.isLeaf = true;
            leafNum++;
        } else {
            node.next = reducible[level];
            reducible[level] = node;
        }

        return node;
    }

    /**
     * addColor
     *
     * @param {OctreeNode} node the octree node
     * @param {Object} color color object
     * @param {Number} level node level
     * @return {undefined}
     */
    function addColor(node, color, level) {
        if (node.isLeaf) {
            node.pixelCount++;
            node.red += color.r;
            node.green += color.g;
            node.blue += color.b;
        } else {
            // 由于 js 内部都是以浮点型存储数值，所以位运算并没有那么高效
            // 在此使用直接转换字符串的方式提取某一位的值
            var str = "";
            var r = color.r.toString(2);
            var g = color.g.toString(2);
            var b = color.b.toString(2);
            while (r.length < 8) r = '0' + r;
            while (g.length < 8) g = '0' + g;
            while (b.length < 8) b = '0' + b;

            str += r[level];
            str += g[level];
            str += b[level];
            var idx = parseInt(str, 2);

            if (null === node.children[idx]) {
                node.children[idx] = createNode(node, idx, level + 1);
            }

            if (undefined === node.children[idx]) {
                console.log(color.r.toString(2));
            }

            addColor(node.children[idx], color, level + 1);
        }
    }

    /**
     * reduceTree
     *
     * @return {undefined}
     */
    function reduceTree() {
        // find the deepest level of node
        var lv = 6;
        while (null === reducible[lv]) lv--;

        // get the node and remove it from reducible link
        var node = reducible[lv];
        reducible[lv] = node.next;

        // merge children
        var r = 0;
        var g = 0;
        var b = 0;
        var count = 0;
        for (var i = 0; i < 8; i++) {
            if (null === node.children[i]) continue;
            r += node.children[i].red;
            g += node.children[i].green;
            b += node.children[i].blue;
            count += node.children[i].pixelCount;
            leafNum--;
        }

        node.isLeaf = true;
        node.red = r;
        node.green = g;
        node.blue = b;
        node.pixelCount = count;
        leafNum++;
    }

    /**
     * buildOctree
     *
     * @param {Array} pixels The pixels array
     * @param {Number} maxColors The max count for colors
     * @return {undefined}
     */
    function buildOctree(pixels, maxColors) {
        for (var i = 0; i < pixels.length; i++) {
            // 添加颜色
            addColor(root, pixels[i], 0);

            // 合并叶子节点
            while (leafNum > maxColors) reduceTree();
        }
    }

    /**
     * colorsStats
     *
     * @param {OctreeNode} node the node will be stats
     * @param {Object} object color stats
     * @return {undefined}
     */
    function colorsStats(node, object) {
        if (node.isLeaf) {
            var r = parseInt(node.red / node.pixelCount).toString(16);
            var g = parseInt(node.green / node.pixelCount).toString(16);
            var b = parseInt(node.blue / node.pixelCount).toString(16);
            if (r.length === 1) r = '0' + r;
            if (g.length === 1) g = '0' + g;
            if (b.length === 1) b = '0' + b;

            var color = r + g + b;
            if (object[color]) object[color] += node.pixelCount;
            else object[color] = node.pixelCount;

            return;
        }

        for (var i = 0; i < 8; i++) {
            if (null !== node.children[i]) {
                colorsStats(node.children[i], object);
            }
        }
    }


    /**
     * 
     * 
     * @param {any} file 传入文件参数
     */
    function sprouting(files) {
        //读取图片数据
        var filereader = new FileReader();

        filereader.onload = function (oFREvent) {
            // 通过 result 来访问生成的 DataURL
            var url = oFREvent.target.result;

            setImageURL(url);
        };

        //传入之后自动调用onload
        filereader.readAsDataURL(files);

    }

    /**
     * 
     * 
     * @param {any} url 传入base64
     */
    function setImageURL(url) {

        var image = new Image();

        image.src = url;
        image.onload = function () {
            //为canvas设置宽高，方便开发，生产模式下删除
            canvas.width = image.width;
            canvas.height = image.height;

            //插入图片
            ctx.drawImage(image, 0, 0);

            //传入宽高获取图像数据
            getImageData(image.width, image.height);
        };
    }

    //接下来获取数据
    function getImageData(width, height) {
        var imgData = ctx.getImageData(0, 0, width, height);
        var array = [];
        var r, g, b = 0;

        for (var i = 0, length = imgData.data.length; i < length; i += 4) {
            // imgData.data[i] = 255 - imgData.data[i];
            // imgData.data[i + 1] = 255 - imgData.data[i + 1];
            // imgData.data[i + 2] = 255 - imgData.data[i + 2];
            // imgData.data[i + 3] = 255;

            r = imgData.data[i];
            g = imgData.data[i + 1];
            b = imgData.data[i + 2];
            array.push({
                r: r,
                g: g,
                b: b
            });
        }

        buildOctree(array, 256);

        var colors = {};
        colorsStats(root, colors);

        var result = [];
        for (var key in colors) {
            result.push({
                color: key,
                count: colors[key]
            });
        }

        console.log(result[0].color);
        var string = "";
        for (var j = 0; j < result.length; j++) {
            string += "<div style=\"width: 50px; height: 21px; float: left; margin-right: 5px; margin-bottom: 5px; background: #" + result[j].color + "; color: #fff; font-size: 12px; text-align: center; padding-top: 9px;\">" + result[j].count + "</div>";
        }
        document.querySelector('.color').innerHTML = string;
    }






    var init = animism.fn.init = function (selector) {
        var files = selector.files[0];

        //检测图片格式是否正确
        if (!files) {
            return false;
        }
        if (files.type && !rtype.test(files.type)) {
            alert('请上传正确的文件(图片)');
        } else {
            //开始处理

            sprouting(files);
        }


        return this;
    };


    // 给init函数后实例化animism原型
    init.prototype = animism.fn;

    window.animism = animism; //对外提供接口  

    return animism;
}));