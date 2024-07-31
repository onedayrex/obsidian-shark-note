import {
	addIcon,
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	requestUrl,
	Setting
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	syncPath: string;
	cookie: string
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	syncPath: 'sharkNotes',
	cookie: ''
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		addIcon("notebook-tabs",'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-notebook-tabs"><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M15 2v20"/><path d="M15 7h5"/><path d="M15 12h5"/><path d="M15 17h5"/></svg>')
		await this.loadSettings();
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('notebook-tabs', '闪念笔记', (evt: MouseEvent) => {
			if(!this.settings.cookie){
				new Notice('Please set cookie first!');
				return;
			}
			// Called when the user clicks the icon.
			const myHeaders = {
				"priority": "u=1, i",
				"Cookie": this.settings.cookie,
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"content-type": "application/json"
			};

			requestUrl({
				url:"https://api.juejin.cn/note_api/note/list_all?aid=6587&uuid=7354201638113019431",
				method: 'POST',
				headers: myHeaders
			})
				.then(result => {
					new Notice('Pull notes success!');
					//Get Shark Notes Base Folder
					let folder = this.app.vault.getFolderByPath(this.settings.syncPath);
					if (!folder) {
						new Notice(`Create Folder With Setting ${this.settings.syncPath}`)
						this.app.vault.createFolder(this.settings.syncPath);
						folder = this.app.vault.getFolderByPath(this.settings.syncPath);
					}

					//Delete Origin notes
					folder?.children.forEach(async (file) => {
						await this.app.vault.delete(file);
					})
					new Notice(`Delete Shark Notes`)
					//sync notes
					console.log(result)
					if(result && result.json){
						new Notice(`Sync notes count ${result.json.count}`)
						result.json.data.forEach((item:any) => {
							let content = item.note_info.content;
							const extra = item.note_info.extra;
							let title:string = item.note_meta.title;
							if(extra){
								const jsonExtra = JSON.parse(extra);
								let extraContent:string = jsonExtra.content;
								if(extraContent){
									extraContent = extraContent.replace(/\n/g,'');
								}
								let reference = '\n';
								if(jsonExtra.title){
									reference += `\n\t标题：${jsonExtra.title}`;
								}
								if(jsonExtra.url){
									reference += `\n\t网址：${jsonExtra.url}`;
								}
								if(extraContent){
									reference += `\n\t引用：${extraContent}`;
								}

								content += reference;

								//if title is empty use extra title or empty
								if(!title){
									if(!jsonExtra.title){
										title = '未命名';
									}else {
										title = jsonExtra.title;
									}
								}
							}
							// const tags = item.tags;
							// if(tags){
							// 	let tagsContent ='---' +
							// 		'tags:';
							// 	tags.forEach((tag:string) => {
							// 		tagsContent+=`\n  - ${tag}`;
							// 	})
							//
							// }
							this.app.vault.create(`${this.settings.syncPath}/${title}.md`, content, {
								ctime: item.note_meta.ctime,
								mtime: item.note_meta.mtime,
							})
						})
					}


				})
				.catch(error => console.log('error', error));
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Sync Path')
			.setDesc('config where to save your shark notes relative')
			.addText(text => text
				.setPlaceholder('notes path')
				.setValue(this.plugin.settings.syncPath)
				.onChange(async (value) => {
					this.plugin.settings.syncPath = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('cookie')
			.setDesc('cookie with shark notes')
			.addText(text => text
				.setPlaceholder('cookies')
				.setValue(this.plugin.settings.cookie)
				.onChange(async (value) => {
					this.plugin.settings.cookie = value;
					await this.plugin.saveSettings();
				})
			)
	}
}
