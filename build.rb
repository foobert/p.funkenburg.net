require 'date'
require 'yaml'
require 'mustache'
require 'fileutils'
require 'mini_magick'

$imgcache = nil
if File.exist?('.cache/imgcache')
    $imgcache = YAML.load(File.read('.cache/imgcache')) rescue nil
end
$imgcache ||= Hash.new

network = '/Volumes/daten1/pictures/p.funkenburg.net/albums'

if Dir.exist?(network)
    system('rsync', '-avz', '--delete', network, '.')
else
    puts "Network share #{network} not found. Won't sync images!"
end

def scan_albums
    puts 'Scan albums...'
    albums = Dir['albums/*'].map do |album_path|
        scan_album(album_path) if File.directory?(album_path)
    end
    albums.compact!
    meta = YAML.load(File.read('albums/meta.yaml', :encoding => 'utf-8'))
    albums.sort_by! {|album| meta['sort'].find_index(File.basename(album.path)) }

    return albums
end

def scan_album(album_path)
    puts "Scan #{album_path}..."
    image_paths = Dir.glob(File.join(album_path, '*.{jpg,jpeg,png,gif}'), File::FNM_CASEFOLD)
    images = image_paths.map do |image_path|
        key = File.join(album_path, image_path)
        if $imgcache.has_key? key
            img = $imgcache[key]
        else
            puts "Scan #{image_path}..."
            img = MiniMagick::Image.new(image_path)
            $imgcache[key] = img
        end
        #require 'ostruct'
        #img = OpenStruct.new
        #img.exif = {'DateTimeOriginal' => Time.now.to_s}
        #img.width = 1920
        #img.height = 1080
        ratio = if img.width > img.height then
                    img.height.to_f / img.width * 100
                else
                    img.width.to_f / img.height * 100
                end

        date = if img.exif['DateTimeOriginal']
                   Date.strptime(img.exif['DateTimeOriginal'], '%Y:%m:%d %H:%M:%S')
               else
                   File.ctime(image_path)
               end

        OpenStruct.new({
            path: image_path,
            src: File.basename(image_path),
            basename: File.basename(image_path, File.extname(image_path)),
            preview: label(File.basename(image_path), 'preview'),
            date: date,
            date_pretty: date.strftime('%Y-%m-%d'),
            exif: img.exif,
            width: img.width,
            height: img.height,
            ratio: ratio,
        })
    end

    images.sort_by! {|img| img[:date].to_s }

    meta = OpenStruct.new(YAML.load(File.read(File.join(album_path, 'meta.yaml'), :encoding => 'utf-8')))
    return OpenStruct.new({
        meta: meta,
        path: album_path,
        images: images,
    })
end

def render_index(albums)
    FileUtils.mkdir_p('build') unless Dir.exist?('build')
    %w{ lazyload.min.js spinner.gif index.css index.js header.css single.css favicon.ico }.each do |file|
        FileUtils.cp(File.join('template', file), 'build')
    end

    albums.each do |album|
        album.meta.cover_resized = rename(album.meta.cover, 'meta_cover')
    end
    template = File.read('template/index.html')
    rendered = Mustache.render(template, {albums: albums})
    File.open('build/index.html', 'w:utf-8') {|f| f.write(rendered) }
end

def label(path, label)
    dir = File.dirname(path)
    ext = File.extname(path)
    base = File.basename(path, ext)
    File.join(dir, "#{base}.#{label}#{ext}")
end

def rename(path, name)
    dir = File.dirname(path)
    ext = File.extname(path).downcase
    File.join(dir, "#{name}#{ext}")
end

def render_albums(albums)
    FileUtils.cp('template/album.css', 'build')

    template = File.read('template/album.html')

    albums.each do |album|
        puts "Render #{album.path}..."
        FileUtils.mkdir_p(File.join('build', album.path)) unless Dir.exist?(File.join('build', album.path))
        data = album.clone
        data.pictures1 = []
        data.pictures2 = []
        data.pictures3 = []
        data.pictures4 = []

        cover_src = File.join(album.path, album.meta.cover)
        cover_dst = File.join('build', album.path, rename(album.meta.cover, 'meta_cover'))
        if not File.exist?(cover_dst)
            puts "Resize #{cover_dst}..."
            MiniMagick::Image.new(cover_src) do |cover_img|
                cover_img.resize('1102x620^')
                cover_img.gravity('center')
                cover_img.crop('1102x620+0+0')
                cover_img.write(cover_dst)
            end
        end

        album.images.each do |image|
            original_dst = File.join('build', image.path)
            preview_dst = label(original_dst, 'preview')
            if not File.exist? preview_dst
                puts "Resizing #{image.path}"
                MiniMagick::Image.new(image.path) do |img|
                    img.resize('480x')
                    img.write(preview_dst)
                end
            end
            if not File.exist? original_dst
                puts "Copying #{image.path}"
                FileUtils.cp(image.path, original_dst)
            end
        end

        i = 0
        album.images.each do |image|
            bucket = case i%4
                     when 0
                         :pictures1
                     when 1
                         :pictures2
                     when 2
                         :pictures3
                     else
                         :pictures4
                     end
            i+=1

            data[bucket] << image
            #FileUtils.cp(image, "build/#{album}")
        end
        rendered = Mustache.render(template, data)
        FileUtils.mkdir_p(File.join('build', album.path)) unless Dir.exist?(File.join('build', album.path))
        File.open(File.join('build', album.path, 'index.html'), 'w') {|f| f.write(rendered) }

        render_singles(album)
    end
end

def ext(path, new_ext)
    dir = File.dirname(path)
    ex = File.extname(path)
    base = File.basename(path, ex)
    File.join(dir, "#{base}#{new_ext}")
end

def render_singles(album)
    template = File.read('template/single.html')

    album.images.each do |image|
        rendered = Mustache.render(template, image)
        FileUtils.mkdir_p(File.join('build', album.path)) unless Dir.exist?(File.join('build', album.path))
        File.open(File.join('build', ext(image.path, '.html')), 'w') {|f| f.write(rendered) }
    end
end

albums = scan_albums()


FileUtils.mkdir_p('.cache') unless Dir.exist?('.cache')
File.open('.cache/imgcache', 'w') {|f| f.write(YAML.dump($imgcache)) }

render_index(albums)
render_albums(albums)
