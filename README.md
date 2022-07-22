# ms-ra-forwarder

创建这个项目的初衷是为了能够在[阅读（legado）](https://github.com/gedoor/legado)中听“晓晓”念书。由于其中的脚本引擎不支持 WebSocket ，所以包装了一下微软 Edge 浏览器“大声朗读”的接口。

如果你的项目可以使用 WebSocket ，请直接在项目中调用原接口。具体代码可以参考 [ra/index.ts](ra/index.ts)。

## 重要更改

**2022-07-17：添加 Azure TTS API 支持（没怎么测试，不知道用起来稳不稳定）。因为调用 Azure TTS API 需要获取授权码。其它方式只需要或取一次就可以使用一段时间，而 Vercel 每次调用 API 都需要重新获取授权码。容易超时不说，也加剧了微软服务器的负担，所以不是很推荐部署在 Vercel 的用户使用（虽然也不是不能用～但是万一微软被薅痛了，又改接口就不好了😂）。**

2022-07-02：测试目前还支持的格式有 `webm-24khz-16bit-mono-opu`、`audio-24khz-48kbitrate-mono-mp3`、`audio-24khz-96kbitrate-mono-mp3`。另外今天下午开始，使用不在下拉列表中声音会出现类似 “Unsupported voice zh-CN-YunyeNeural.” 错误，后续可能也会被砍掉。且用且珍惜吧！

2022-07-01：~~部署在中国大陆以外服务器上的服务目前只能选择 `webm-24khz-16bit-mono-opus` 格式的音频了！~~ 所以使用 Vercel 的用户需要重新部署一下。

2022-06-16：Edge 浏览器提供的接口现在已经不能设置讲话风格了，若发现不能正常使用，请参考 [#12](https://github.com/meetcw/ms-ra-forwarder/issues/12#issuecomment-1157271193) 获取更新。


## 部署

请参考下列部署方式。


### 部署到 Railway（推荐）

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/p8RU3T?referralCode=-hqLZp)

### 部署到 Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)


### Docker

需要安装 docker。

``` bash
# 拉取镜像
docker pull meetcw/ms-ra-forwarder:latest
# 运行
docker run --name ms-ra-forwarder -d -p 3000:3000 meetcw/ms-ra-forwarder
# 浏览器访问 http://localhost:3000
```

### Docker Compose

创建 `docker-compose.yml` 写入以下内容并保存。

``` yaml
version: '3'

services:
  ms-ra-forwarder:
    container_name: ms-ra-forwarder
    image: meetcw/ms-ra-forwarder:latest
```

在 `docker-compose.yml` 目录下执行 `docker compose up -d`。

### 部署到 Vercel

请先 Fork 一份代码然后部署到自己的 Vercel 中 。参考 [演示视频](https://www.youtube.com/watch?v=vRC6umZp8hI)。

**注：现在不是很推荐使用 Vercel 部署**


### 手动运行

手动运行需要事先安装好 git 和 nodejs。

```bash
# 获取代码
git clone https://github.com/meetcw/ms-ra-forwarder.git

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

接口地址为：
```
POST /api/ra
FORMAT: audio-16khz-128kbitrate-mono-mp3
Content-Type: text/plain

<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="zh-CN-XiaoxiaoNeural">
    表征这个词印象中就没在中文里见到过
  </voice>
</speak>
```

#### 定制发音和音色
请求的正文为 ssml 格式，支持定制发音人和~~说话风格~~（最新接口不再支持定制说话风格），下面是相关的示例和文档：

[文本转语音](https://azure.microsoft.com/zh-cn/services/cognitive-services/text-to-speech/#overview)

[通过语音合成标记语言 (SSML) 改善合成](https://docs.microsoft.com/zh-cn/azure/cognitive-services/speech-service/speech-synthesis-markup?tabs=csharp)



#### 音频格式
默认的音频格式为 mp3 ，如果需要获取为其他格式的音频请修改请求头的 `FORMAT`（可用的选项可以在 [ra/index.ts](ra/index.ts#L5) 中查看）。

### 限制访问

由于 Vercel 并非无限制的免费，如果需要防止他人滥用你的部署的服务，可以在应用的环境变量中添加 `TOKEN`，然后在请求头中添加 `Authorization: Bearer <TOKEN>`访问。注意：这只会阻止未授权的请求调用微软的接口，并不会减少  Vercel Serverless Function 限额的用量（大概会减少一点流量）。

## 相关项目

- [ag2s20150909/TTS](https://github.com/ag2s20150909/TTS)：安卓版，可代替系统自带的TTS。
- [litcc/tts-server](https://github.com/litcc/tts-server)：Rust 版本。

## 其他说明

- 微软官方的 Azure TTS 服务目前拥有一定的免费额度，如果免费额度对你来说够用的话，请支持官方的服务。

- 如果只需要为固定的文本生成语音，可以使用[有声内容创作](https://speech.microsoft.com/audiocontentcreation)。它提供了更丰富的功能可以生成更自然的声音。

- 本项目使用的是Edge浏览器“大声朗读”功能的接口，不保证后续可用性和稳定性。

- **本项目仅供学习和参考，请勿商用。**
