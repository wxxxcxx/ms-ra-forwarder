# ms-ra-forwarder

创建这个项目的初衷是为了能够在[阅读（legado）](https://github.com/gedoor/legado)中听“晓晓”念书。由于其中的脚本引擎不支持 WebSocket ，所以包装了一下微软 Edge 浏览器“大声朗读”的接口。

如果你的项目可以使用 WebSocket ，请直接在项目中调用原接口。具体代码可以参考 [ra/index.ts](ra/index.ts)。

## 重要更改

**2023-04-19：Azure 下线了演示页面的试用功能，导致 Azure 版接口无法使用了，请各位迁移到 Edge 浏览器的接口吧。** 

2022-11-18：添加词典文件支持，词典文件格式参考 https://github.com/wxxxcxx/azure-tts-lexicon-cn/blob/main/lexicon.xml 。

2022-09-10：修改 docker 仓库地址，后面构建的 docker 镜像会迁移到 wxxxcxx/ms-ra-forwarder（原仓库旧版本镜像依然有效）。

2022-09-01：Azure TTS API 好像又改了，旧版用户可能会无法正常使用，请更新到最新版。

2022-07-17：添加 Azure TTS API 支持（没怎么测试，不知道用起来稳不稳定）。因为调用 Azure TTS API 需要获取授权码。其它方式只需要或取一次就可以使用一段时间，而 Vercel 每次调用 API 都需要重新获取授权码。容易超时不说，也加剧了微软服务器的负担，所以不是很推荐部署在 Vercel 的用户使用（虽然也不是不能用～但是万一微软被薅痛了，又改接口就不好了😂）。

2022-07-02：Edge 版本的 API 目前测试还支持的格式有 `webm-24khz-16bit-mono-opu`、`audio-24khz-48kbitrate-mono-mp3`、`audio-24khz-96kbitrate-mono-mp3`。另外今天下午开始，使用不在下拉列表中声音会出现类似 “Unsupported voice zh-CN-YunyeNeural.” 错误，后续可能也会被砍掉。且用且珍惜吧！

2022-07-01：~~部署在中国大陆以外服务器上的服务目前只能选择 `webm-24khz-16bit-mono-opus` 格式的音频了！~~ 所以使用 Vercel 的用户需要重新部署一下。

2022-06-16：Edge 浏览器提供的接口现在已经不能设置讲话风格了，若发现不能正常使用，请参考 [#12](https://github.com/wxxxcxx/ms-ra-forwarder/issues/12#issuecomment-1157271193) 获取更新。


## 部署

请参考下列部署方式。

### 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwxxxcxx%2Fms-ra-forwarder&env=TOKEN&envDescription=%E8%AE%BF%E9%97%AE%E4%BB%A4%E7%89%8C&project-name=ms-ra-forwarder&repository-name=ms-ra-forwarder)

~~请先 Fork 一份代码然后部署到自己的 Vercel 中 。参考 [演示视频](https://www.youtube.com/watch?v=vRC6umZp8hI)。~~


### 部署到 Railway

Railway 增加了每个月500小时的限制，而且不会自动停机，所以每个月会有一段时间无法是使用。有条件的还是使用docker部署吧。

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/p8RU3T?referralCode=-hqLZp)

### 部署到 Heroku


[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)


### Docker（推荐）

需要安装 docker。

``` bash
# 拉取镜像
docker pull wxxxcxx/ms-ra-forwarder:latest
# 运行
docker run --name ms-ra-forwarder -d -p 3000:3000 wxxxcxx/ms-ra-forwarder
# or
docker run --name ms-ra-forwarder -d -p 3000:3000 -e TOKEN:自定义TOKEN wxxxcxx/ms-ra-forwarder

# 浏览器访问 http://localhost:3000
```

### Docker Compose

创建 `docker-compose.yml` 写入以下内容并保存。

``` yaml
version: '3'

services:
  ms-ra-forwarder:
    container_name: ms-ra-forwarder
    image: wxxxcxx/ms-ra-forwarder:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      # 不需要可以不用设置环境变量
      - TOKEN=自定义TOKEN
```

在 `docker-compose.yml` 目录下执行 `docker compose up -d`。



### 手动运行

手动运行需要事先安装好 git 和 nodejs。

```bash
# 获取代码
git clone https://github.com/wxxxcxx/ms-ra-forwarder.git

cd ms-ra-forwarder
# 安装依赖
npm install 
# 运行
npm run start
```

## 使用

### 导入到阅读（legado）

请访问你部署好的网站，在页面中测试没有问题后点击“生成阅读（legado）语音引擎链接”，然后在阅读（legado）中导入。

### 手动调用

接口地址为 `api/azure` 或 `api/ra`。格式为：
```
POST /api/ra
FORMAT: audio-16khz-128kbitrate-mono-mp3
Content-Type: text/plain

<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="zh-CN-XiaoxiaoNeural">
    如果喜欢这个项目的话请点个 Star 吧。
  </voice>
</speak>
```

#### 定制发音和音色
请求的正文为 ssml 格式，支持定制发音人和讲话风格（目前仅 Azure 版本支持定制讲话风格），下面是相关的示例和文档：

[文本转语音](https://azure.microsoft.com/zh-cn/services/cognitive-services/text-to-speech/#overview)

[通过语音合成标记语言 (SSML) 改善合成](https://docs.microsoft.com/zh-cn/azure/cognitive-services/speech-service/speech-synthesis-markup?tabs=csharp)



#### 音频格式
默认的音频格式为 webm ，如果需要获取为其他格式的音频请修改请求头的 `FORMAT`（可用的选项可以在 [ra/index.ts](ra/index.ts#L5) 中查看）。

### 限制访问

如果需要防止他人滥用你的部署的服务，可以在应用的环境变量中添加 `TOKEN`，然后在请求头中添加 `Authorization: Bearer <TOKEN>`访问。

## 相关项目

- [ag2s20150909/TTS](https://github.com/ag2s20150909/TTS)：安卓版，可代替系统自带的TTS。
- [litcc/tts-server](https://github.com/litcc/tts-server)：Rust 版本。

## 其他说明

- 微软官方的 Azure TTS 服务目前拥有一定的免费额度，如果免费额度对你来说够用的话，请支持官方的服务。

- 如果只需要为固定的文本生成语音，可以使用[有声内容创作](https://speech.microsoft.com/audiocontentcreation)。它提供了更丰富的功能可以生成更自然的声音。

- 本项目使用的是 Edge 浏览器“大声朗读”和 Azure TTS 演示页面的接口，不保证后续可用性和稳定性。

- **本项目仅供学习和参考，请勿商用。**
